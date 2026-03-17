package server

import (
	"PhotoUploader/internal/database"
	"context"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"fmt"
	"github.com/fatih/color"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/api/option"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/joho/godotenv/autoload"
)

type Server struct {
	port       int
	dbPool     *pgxpool.Pool
	models     database.Models
	authClient *auth.Client
	infoLog    *log.Logger
}

func NewServer() *http.Server {
	opt := option.WithCredentialsFile("FirebaseAdminCredential.json")
	firebaseClient, err := firebase.NewApp(context.Background(), nil, opt)

	if err != nil {
		log.Fatal(err)
	}

	authClient, err := firebaseClient.Auth(context.Background())

	if err != nil {
		log.Fatal(err)
	}

	err = SetAdmin(authClient)

	if err != nil {
		log.Fatalf("error setting admins %v\n", err)
	}

	port, _ := strconv.Atoi(os.Getenv("PORT"))
	dbPool, err := NewPool()

	if err != nil {
		log.Fatal(err)
	}

	models := database.NewModels(dbPool)

	infoPrefix := color.New(color.FgCyan, color.Bold).SprintFunc()("[INFO]: \t")
	infoLog := log.New(os.Stdout, infoPrefix, log.LstdFlags|log.Lshortfile)

	NewServer := &Server{
		port:       port,
		dbPool:     dbPool,
		models:     models,
		authClient: authClient,
		infoLog:    infoLog,
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

func SetAdmin(authClient *auth.Client) error {
	adminUIDs := strings.Split(os.Getenv("UID_ADMIN_USER"), ",")

	for _, adminUID := range adminUIDs {
		claims := map[string]interface{}{"role": "admin"}
		err := authClient.SetCustomUserClaims(context.Background(), strings.TrimSpace(adminUID), claims)

		if err != nil {
			return err
		}
	}

	return nil
}
