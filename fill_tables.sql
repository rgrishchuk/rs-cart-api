CREATE TYPE status_enum AS ENUM ('OPEN', 'ORDERED');

CREATE TABLE carts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at date NOT NULL,
  updated_at date NOT NULL,
  status status_enum NOT NULL
);

CREATE TABLE cart_items (
  cart_id uuid REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid,
  count integer
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  cart_id UUID NOT NULL REFERENCES carts(id),
  payment JSON NOT NULL,
  delivery JSON NOT NULL,
  comments TEXT,
  status TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL
  is_admin BOOLEAN DEFAULT FALSE
);

INSERT INTO carts (id, user_id, created_at, updated_at, status)
VALUES
  ('6f94478e-34be-4e0a-a670-dfb44b21d949', 'f57585c1-9a9c-4e70-a1ad-4a4ca4fa4bb0', '2023-04-05', '2023-04-05', 'OPEN');

INSERT INTO cart_items (cart_id, product_id, count)
VALUES
  ('6f94478e-34be-4e0a-a670-dfb44b21d949', '795043c3-a5ea-430c-97d7-569027c6c1fd', 1);