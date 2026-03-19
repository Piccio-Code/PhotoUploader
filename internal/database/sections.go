package database

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"
)

type SectionsModel struct {
	DB *pgxpool.Pool
}

type SectionDB struct {
	Id        int
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type SectionRequest struct {
	Id   int    `json:"id,omitempty"`
	Name string `json:"name,omitempty" binding:"required"`
}

type SectionResponse struct {
	Id        int       `json:"id,omitempty"`
	Name      string    `json:"name,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *SectionsModel) List(ctx context.Context) ([]SectionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `SELECT id, name, created_at, updated_at FROM sections`

	rows, err := s.DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []SectionResponse
	for rows.Next() {
		var sec SectionResponse
		err := rows.Scan(&sec.Id, &sec.Name, &sec.CreatedAt, &sec.UpdatedAt)
		if err != nil {
			return nil, err
		}
		result = append(result, sec)
	}

	return result, nil
}

func (s *SectionsModel) Create(ctx context.Context, newSection SectionRequest) (SectionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
        INSERT INTO sections (name, created_at, updated_at)
        VALUES ($1, NOW(), NOW())
        RETURNING id, name, created_at, updated_at`

	var sec SectionResponse
	err := s.DB.QueryRow(ctx, query, newSection.Name).
		Scan(&sec.Id, &sec.Name, &sec.CreatedAt, &sec.UpdatedAt)
	if err != nil {
		return SectionResponse{}, err
	}

	return sec, nil
}

func (s *SectionsModel) Get(ctx context.Context, id int) (SectionResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `SELECT id, name, created_at, updated_at FROM sections WHERE id = $1`

	var sec SectionResponse
	err := s.DB.QueryRow(ctx, query, id).
		Scan(&sec.Id, &sec.Name, &sec.CreatedAt, &sec.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return SectionResponse{}, NotFoundError
		}
		return SectionResponse{}, err
	}

	return sec, nil
}

func (s *SectionsModel) Update(ctx context.Context, newSection SectionRequest) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
        UPDATE sections
        SET name = $1, updated_at = NOW()
        WHERE id = $2`

	result, err := s.DB.Exec(ctx, query, []interface{}{newSection.Name, newSection.Id}...)

	if err != nil {
		return err
	}

	affected := result.RowsAffected()

	if affected == 0 {
		return NotFoundError
	}

	return err
}

func (s *SectionsModel) Delete(ctx context.Context, id int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `DELETE FROM sections WHERE id = $1`

	result, err := s.DB.Exec(ctx, query, id)

	if err != nil {
		return err
	}

	affected := result.RowsAffected()

	if affected == 0 {
		return NotFoundError
	}

	return err
}
