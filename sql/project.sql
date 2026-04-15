create table if not exists "user"
(
    id uuid not null primary key,
    activation_token char(32),
    avatar_url varchar(256),
    bio varchar(256),
    created_at timestamptz,
    email varchar(128) not null unique,
    hash char(97) not null,
    username varchar(32) not null unique
);

create table if not exists friend
(
    requestee_id uuid not null references "user"(id),
    requestor_id uuid not null references "user"(id),
    accepted boolean,
    PRIMARY KEY (requestee_id, requestor_id)
);
create index on friend(requestor_id);
create index on friend(requestee_id);

create table if not exists recipe
(
    id uuid not null primary key,
    user_id uuid not null references "user"(id),
    calories varchar(16),
    carbs varchar(16),
    cook_time varchar(16),
    cuisine varchar(32),
    fat_content varchar(128),
    image_url varchar(256),
    instructions jsonb,
    ingredients jsonb,
    meal_category varchar(32),
    prep_time varchar(32),
    protein varchar(16),
    servings smallint,
    title varchar(128),
    total_time varchar(16)
);
create index on recipe(user_id);

create table if not exists review
(
    recipe_id uuid not null references recipe(id),
    user_id uuid not null references "user"(id),
    body varchar(256),
    created_at timestamptz,
    rating integer,
    primary key(recipe_id, user_id)
);
create index on review(recipe_id);
create index on review(user_id);

create table if not exists ingredient
(
    id uuid not null,
    name_ing varchar(32)
);

