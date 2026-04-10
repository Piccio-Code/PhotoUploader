-- +goose Up
ALTER TABLE photos
    ALTER COLUMN priority TYPE INTEGER
        USING priority::INTEGER;

ALTER TABLE photos
    ALTER COLUMN priority SET DEFAULT 0;

ALTER TABLE photos
    RENAME COLUMN priority TO position;

-- +goose Down
ALTER TABLE photos
    RENAME COLUMN position TO priority;

ALTER TABLE photos
    ALTER COLUMN priority DROP DEFAULT;
