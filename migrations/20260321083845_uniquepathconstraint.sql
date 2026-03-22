-- +goose Up
ALTER TABLE photos
    ADD CONSTRAINT uniquePath UNIQUE (path, section_id);

-- +goose Down
ALTER TABLE photos
    DROP CONSTRAINT uniquePath;
