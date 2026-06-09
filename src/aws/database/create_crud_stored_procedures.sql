-- App CRUD stored procedures/functions for Postgres/RDS
-- Run this once after your tables exist.
-- Inserts and updates are wrapped in stored procedures.
-- Audit triggers still handle audit writes automatically.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Lets media_gold_reviews_chunked generate chunk IDs when omitted.
-- Your current table uses text, so this keeps it compatible.
ALTER TABLE media_gold_reviews_chunked
    ALTER COLUMN chunk_id SET DEFAULT gen_random_uuid()::text;

CREATE OR REPLACE PROCEDURE sp_insert_sales_customers(
    IN p_customer_id integer,
    IN p_first_name text,
    IN p_last_name text,
    IN p_email_address text,
    IN p_phone_number text,
    IN p_address text,
    IN p_city text,
    IN p_state text,
    IN p_country text,
    IN p_continent text,
    IN p_postal_zip_code text,
    IN p_gender text
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO sales_customers ("customer_id", "first_name", "last_name", "email_address", "phone_number", "address", "city", "state", "country", "continent", "postal_zip_code", "gender")
    VALUES (p_customer_id, p_first_name, p_last_name, p_email_address, p_phone_number, p_address, p_city, p_state, p_country, p_continent, p_postal_zip_code, p_gender);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_update_sales_customers(
    IN p_customer_id integer,
    IN p_first_name text,
    IN p_last_name text,
    IN p_email_address text,
    IN p_phone_number text,
    IN p_address text,
    IN p_city text,
    IN p_state text,
    IN p_country text,
    IN p_continent text,
    IN p_postal_zip_code text,
    IN p_gender text
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sales_customers
    SET "first_name" = p_first_name,
        "last_name" = p_last_name,
        "email_address" = p_email_address,
        "phone_number" = p_phone_number,
        "address" = p_address,
        "city" = p_city,
        "state" = p_state,
        "country" = p_country,
        "continent" = p_continent,
        "postal_zip_code" = p_postal_zip_code,
        "gender" = p_gender
    WHERE customer_id = p_customer_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_delete_sales_customers(
    IN p_customer_id integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM sales_customers
    WHERE customer_id = p_customer_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_insert_sales_suppliers(
    IN p_supplier_id integer,
    IN p_name text,
    IN p_ingredient text,
    IN p_continent text,
    IN p_city text,
    IN p_district text,
    IN p_size text,
    IN p_longitude numeric,
    IN p_latitude numeric,
    IN p_approved text
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO sales_suppliers ("supplier_id", "name", "ingredient", "continent", "city", "district", "size", "longitude", "latitude", "approved")
    VALUES (p_supplier_id, p_name, p_ingredient, p_continent, p_city, p_district, p_size, p_longitude, p_latitude, p_approved);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_update_sales_suppliers(
    IN p_supplier_id integer,
    IN p_name text,
    IN p_ingredient text,
    IN p_continent text,
    IN p_city text,
    IN p_district text,
    IN p_size text,
    IN p_longitude numeric,
    IN p_latitude numeric,
    IN p_approved text
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sales_suppliers
    SET "name" = p_name,
        "ingredient" = p_ingredient,
        "continent" = p_continent,
        "city" = p_city,
        "district" = p_district,
        "size" = p_size,
        "longitude" = p_longitude,
        "latitude" = p_latitude,
        "approved" = p_approved
    WHERE supplier_id = p_supplier_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_delete_sales_suppliers(
    IN p_supplier_id integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM sales_suppliers
    WHERE supplier_id = p_supplier_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_insert_sales_franchises(
    IN p_franchise_id integer,
    IN p_name text,
    IN p_city text,
    IN p_district text,
    IN p_zipcode text,
    IN p_country text,
    IN p_size text,
    IN p_longitude numeric,
    IN p_latitude numeric,
    IN p_supplier_id integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO sales_franchises ("franchise_id", "name", "city", "district", "zipcode", "country", "size", "longitude", "latitude", "supplier_id")
    VALUES (p_franchise_id, p_name, p_city, p_district, p_zipcode, p_country, p_size, p_longitude, p_latitude, p_supplier_id);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_update_sales_franchises(
    IN p_franchise_id integer,
    IN p_name text,
    IN p_city text,
    IN p_district text,
    IN p_zipcode text,
    IN p_country text,
    IN p_size text,
    IN p_longitude numeric,
    IN p_latitude numeric,
    IN p_supplier_id integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sales_franchises
    SET "name" = p_name,
        "city" = p_city,
        "district" = p_district,
        "zipcode" = p_zipcode,
        "country" = p_country,
        "size" = p_size,
        "longitude" = p_longitude,
        "latitude" = p_latitude,
        "supplier_id" = p_supplier_id
    WHERE franchise_id = p_franchise_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_delete_sales_franchises(
    IN p_franchise_id integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM sales_franchises
    WHERE franchise_id = p_franchise_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_insert_sales_transactions(
    IN p_transaction_id integer,
    IN p_customer_id integer,
    IN p_franchise_id integer,
    IN p_date_time timestamptz,
    IN p_product text,
    IN p_quantity integer,
    IN p_unit_price numeric,
    IN p_total_price numeric,
    IN p_payment_method text,
    IN p_card_number text
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO sales_transactions ("transaction_id", "customer_id", "franchise_id", "date_time", "product", "quantity", "unit_price", "total_price", "payment_method", "card_number")
    VALUES (p_transaction_id, p_customer_id, p_franchise_id, p_date_time, p_product, p_quantity, p_unit_price, p_total_price, p_payment_method, p_card_number);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_update_sales_transactions(
    IN p_transaction_id integer,
    IN p_customer_id integer,
    IN p_franchise_id integer,
    IN p_date_time timestamptz,
    IN p_product text,
    IN p_quantity integer,
    IN p_unit_price numeric,
    IN p_total_price numeric,
    IN p_payment_method text,
    IN p_card_number text
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sales_transactions
    SET "customer_id" = p_customer_id,
        "franchise_id" = p_franchise_id,
        "date_time" = p_date_time,
        "product" = p_product,
        "quantity" = p_quantity,
        "unit_price" = p_unit_price,
        "total_price" = p_total_price,
        "payment_method" = p_payment_method,
        "card_number" = p_card_number
    WHERE transaction_id = p_transaction_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_delete_sales_transactions(
    IN p_transaction_id integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM sales_transactions
    WHERE transaction_id = p_transaction_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_insert_media_customer_reviews(
    IN p_new_id integer,
    IN p_review text,
    IN p_franchise_id integer,
    IN p_review_date timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO media_customer_reviews ("new_id", "review", "franchise_id", "review_date")
    VALUES (p_new_id, p_review, p_franchise_id, p_review_date);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_update_media_customer_reviews(
    IN p_new_id integer,
    IN p_review text,
    IN p_franchise_id integer,
    IN p_review_date timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE media_customer_reviews
    SET "review" = p_review,
        "franchise_id" = p_franchise_id,
        "review_date" = p_review_date
    WHERE new_id = p_new_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_delete_media_customer_reviews(
    IN p_new_id integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM media_customer_reviews
    WHERE new_id = p_new_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_insert_media_gold_reviews_chunked(
    IN p_franchise_id integer,
    IN p_review_date timestamptz,
    IN p_chunked_text text,
    IN p_review_uri text
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO media_gold_reviews_chunked ("franchise_id", "review_date", "chunked_text", "review_uri")
    VALUES (p_franchise_id, p_review_date, p_chunked_text, p_review_uri);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_update_media_gold_reviews_chunked(
    IN p_chunk_id text,
    IN p_franchise_id integer,
    IN p_review_date timestamptz,
    IN p_chunked_text text,
    IN p_review_uri text
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE media_gold_reviews_chunked
    SET "franchise_id" = p_franchise_id,
        "review_date" = p_review_date,
        "chunked_text" = p_chunked_text,
        "review_uri" = p_review_uri
    WHERE chunk_id = p_chunk_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_delete_media_gold_reviews_chunked(
    IN p_chunk_id text
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM media_gold_reviews_chunked
    WHERE chunk_id = p_chunk_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_insert_users(
    IN p_name text,
    IN p_email text
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO users ("name", "email")
    VALUES (p_name, p_email);
END;
$$;

CREATE OR REPLACE PROCEDURE sp_update_users(
    IN p_id integer,
    IN p_name text,
    IN p_email text
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE users
    SET "name" = p_name,
        "email" = p_email
    WHERE id = p_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_delete_users(
    IN p_id integer
)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM users
    WHERE id = p_id;
END;
$$;

