package database

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"mime/multipart"
	"time"
)

type PhotoModel struct {
	DB *pgxpool.Pool
}

type PhotoDB struct {
	Id          int
	Position    int
	Path        string
	DefaultPath string
	AltText     string
	SectionId   int
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type PhotoRequest struct {
	Id        int                   `form:"id,omitempty"`
	Photo     *multipart.FileHeader `form:"photo,omitempty"`
	PhotoName string                `form:"photo_name,omitempty"`
	Path      string                `form:"-"`
	Position  int                   `form:"position,omitempty" binding:"gte=1"`
	AltText   string                `form:"alt_text,omitempty"`
	SectionId int                   `form:"section_id,omitempty"`
}

type PhotoResponse struct {
	Id          int       `json:"id,omitempty"`
	Path        string    `json:"path,omitempty"`
	DefaultPath string    `json:"default_path,omitempty"`
	Position    int       `json:"position,omitempty"`
	AltText     string    `json:"altText,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func isDuplicateKeyError(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func (p *PhotoModel) ListBySection(ctx context.Context, sectionId int) ([]PhotoResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
		SELECT id, path, default_path, position, alt_text, created_at, updated_at
		FROM photos
		WHERE section_id = $1
		ORDER BY position`

	rows, err := p.DB.Query(ctx, query, sectionId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []PhotoResponse
	for rows.Next() {
		var photo PhotoResponse
		err := rows.Scan(&photo.Id, &photo.Path, &photo.DefaultPath, &photo.Position, &photo.AltText, &photo.CreatedAt, &photo.UpdatedAt)
		if err != nil {
			return nil, err
		}
		result = append(result, photo)
	}

	return result, nil
}

func (p *PhotoModel) Create(ctx context.Context, newPhoto PhotoRequest) (PhotoResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := p.DB.Begin(ctx)

	if err != nil {
		return PhotoResponse{}, err
	}

	defer tx.Rollback(ctx)

	err = AddOneAfterPosition(ctx, tx, newPhoto.SectionId, newPhoto.Position)

	if err != nil {
		return PhotoResponse{}, err
	}

	query := `
		INSERT INTO photos (path, alt_text, section_id, created_at, updated_at, default_path, position)
		VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)
		RETURNING id, path, default_path, position, alt_text, created_at, updated_at`

	var photo PhotoResponse

	err = tx.QueryRow(ctx, query, newPhoto.Path, newPhoto.AltText, newPhoto.SectionId, newPhoto.Path, newPhoto.Position).
		Scan(&photo.Id, &photo.Path, &photo.DefaultPath, &photo.Position, &photo.AltText, &photo.CreatedAt, &photo.UpdatedAt)

	if err != nil {
		if isDuplicateKeyError(err) {
			return PhotoResponse{}, NotUniquePath
		}
		return PhotoResponse{}, err
	}

	err = tx.Commit(ctx)

	if err != nil {
		return PhotoResponse{}, err
	}

	return photo, nil
}

func (p *PhotoModel) Get(ctx context.Context, id int) (PhotoResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
		SELECT id, path, default_path, position, alt_text, created_at, updated_at
		FROM photos
		WHERE id = $1`

	var photo PhotoResponse
	err := p.DB.QueryRow(ctx, query, id).
		Scan(&photo.Id, &photo.Path, &photo.DefaultPath, &photo.Position, &photo.AltText, &photo.CreatedAt, &photo.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PhotoResponse{}, NotFoundError
		}
		return PhotoResponse{}, err
	}

	return photo, nil
}

func (p *PhotoModel) Update(ctx context.Context, newPhoto PhotoRequest, reorder bool) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := p.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if reorder {
		var currentSectionID int
		var currentPosition int

		getCurrentQuery := `
			SELECT section_id, position
			FROM photos
			WHERE id = $1
			FOR UPDATE`

		err = tx.QueryRow(ctx, getCurrentQuery, newPhoto.Id).Scan(&currentSectionID, &currentPosition)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return NotFoundError
			}
			return err
		}

		targetSectionID := newPhoto.SectionId
		if targetSectionID == currentSectionID {
			switch {
			case newPhoto.Position < currentPosition:
				moveUpQuery := `
					UPDATE photos
					SET position = position + 1
					WHERE section_id = $1
						AND position >= $2
						AND position < $3`
				_, err = tx.Exec(ctx, moveUpQuery, targetSectionID, newPhoto.Position, currentPosition)
			case newPhoto.Position > currentPosition:
				moveDownQuery := `
					UPDATE photos
					SET position = position - 1
					WHERE section_id = $1
						AND position <= $2
						AND position > $3`
				_, err = tx.Exec(ctx, moveDownQuery, targetSectionID, newPhoto.Position, currentPosition)
			}
			if err != nil {
				return err
			}
		} else {
			closeGapQuery := `
				UPDATE photos
				SET position = position - 1
				WHERE section_id = $1
					AND position > $2`
			_, err = tx.Exec(ctx, closeGapQuery, currentSectionID, currentPosition)
			if err != nil {
				return err
			}

			err = AddOneAfterPosition(ctx, tx, targetSectionID, newPhoto.Position)
			if err != nil {
				return err
			}
		}
	}

	query := `
        UPDATE photos
        SET path = $1, position = $2, alt_text = $3, section_id = $4, updated_at = NOW()
        WHERE id = $5`

	result, err := tx.Exec(ctx, query, newPhoto.Path, newPhoto.Position, newPhoto.AltText, newPhoto.SectionId, newPhoto.Id)
	if err != nil {
		if isDuplicateKeyError(err) {
			return NotUniquePath
		}
		return err
	}

	if result.RowsAffected() == 0 {
		return NotFoundError
	}

	return tx.Commit(ctx)
}

func (p *PhotoModel) Delete(ctx context.Context, id, position int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	tx, err := p.DB.Begin(ctx)
	if err != nil {
		return err
	}

	defer tx.Rollback(ctx)

	query := `DELETE FROM photos WHERE id = $1`

	result, err := tx.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return NotFoundError
	}

	query = `		
		UPDATE photos
		SET position = position - 1
		WHERE position >= $1`

	_, err = tx.Exec(ctx, query, position)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (p *PhotoModel) ResetDefaultPath(ctx context.Context, id int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
		UPDATE photos
		SET path = default_path, updated_at = NOW()
		WHERE id = $1`

	result, err := p.DB.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return NotFoundError
	}

	return nil
}

func AddOneAfterPosition(ctx context.Context, tx pgx.Tx, sectionID, position int) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	query := `
				UPDATE photos p
				SET position = p.position + 1
				WHERE p.section_id = $1
					AND p.position >= $2`

	_, err := tx.Exec(ctx, query, sectionID, position)

	return err
}
