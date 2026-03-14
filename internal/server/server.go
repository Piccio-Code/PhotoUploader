package server

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "github.com/joho/godotenv/autoload"
)

type Server struct {
	port   int
	dbPool *pgxpool.Pool
}

func NewServer() *http.Server {

	port, _ := strconv.Atoi(os.Getenv("PORT"))
	dbPool, err := NewPool()

	if err != nil {
		log.Fatal(err)
	}

	NewServer := &Server{
		port:   port,
		dbPool: dbPool,
	}

	// Declare Server config
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", NewServer.port),
		Handler:      NewServer.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server
}

func NewPool() (pool *pgxpool.Pool, err error) {

	pool, err = pgxpool.New(context.Background(), os.Getenv("DSN"))

	if err != nil {
		return nil, err
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, err
	}

	return pool, nil
}
