-- +goose Up
ALTER TABLE photos
    ADD COLUMN priority SERIAL NOT NULL ;
-- +goose Down

ALTER TABLE photos
    DROP COLUMN priority;
