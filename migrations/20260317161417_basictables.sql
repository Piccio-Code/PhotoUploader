-- +goose Up
-- +goose StatementBegin
CREATE TABLE sections (
    id SERIAL NOT NULL PRIMARY KEY ,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE photos (
    id SERIAL NOT NULL PRIMARY KEY,
    path VARCHAR(255) NOT NULL,
    default_path VARCHAR(255) NOT NULL,
    alt_text TEXT NOT NULL,
    section_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    CONSTRAINT section_fk
                    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE sections;
DROP TABLE IF EXISTS photos;
-- +goose StatementEnd
