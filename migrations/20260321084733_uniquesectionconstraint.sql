-- +goose Up
ALTER TABLE sections
    ADD CONSTRAINT uniqueName UNIQUE (name);

-- +goose Down
ALTER TABLE sections
    DROP CONSTRAINT uniqueName;
