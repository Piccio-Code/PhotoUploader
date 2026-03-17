-- +goose Up
CREATE TABLE sections (
                          ID SERIAL NOT NULL PRIMARY KEY,
                          Nome VARCHAR(255) NOT NULL ,
                          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                          updated_at TIMESTAMP
);

CREATE TABLE photos (
                        ID SERIAL NOT NULL PRIMARY KEY,
                        path VARCHAR(255) NOT NULL ,
                        default_path VARCHAR(255) NOT NULL ,
                        alt_text TEXT,
                        section_id INT NOT NULL ,
                        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP,


                        CONSTRAINT section_fk
                            FOREIGN KEY (section_id) REFERENCES sections(ID) ON DELETE CASCADE
);

-- +goose Down

DROP TABLE photos;
DROP TABLE sections;
DROP TABLE users;
DROP TABLE user_roles;