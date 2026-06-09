
-- Replacement CRUD procedures using JSONB rows payloads.
-- This matches your dynamic API pattern:
--   CALL sp_update_<table>(${rows_json}::jsonb, ${modified_by});
--
-- Your audit triggers still do the audit writes automatically.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ID generation defaults.
-- These make inserts work when the app does NOT pass primary key values.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='id') THEN
        CREATE SEQUENCE IF NOT EXISTS users_id_seq;
        EXECUTE 'SELECT setval(''users_id_seq'', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false)';
        ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
        ALTER SEQUENCE users_id_seq OWNED BY users.id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='media_customer_reviews' AND column_name='new_id') THEN
        CREATE SEQUENCE IF NOT EXISTS media_customer_reviews_new_id_seq;
        EXECUTE 'SELECT setval(''media_customer_reviews_new_id_seq'', COALESCE((SELECT MAX(new_id) FROM media_customer_reviews), 0) + 1, false)';
        ALTER TABLE media_customer_reviews ALTER COLUMN new_id SET DEFAULT nextval('media_customer_reviews_new_id_seq');
        ALTER SEQUENCE media_customer_reviews_new_id_seq OWNED BY media_customer_reviews.new_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_customers' AND column_name='customer_id') THEN
        CREATE SEQUENCE IF NOT EXISTS sales_customers_customer_id_seq;
        EXECUTE 'SELECT setval(''sales_customers_customer_id_seq'', COALESCE((SELECT MAX(customer_id) FROM sales_customers), 0) + 1, false)';
        ALTER TABLE sales_customers ALTER COLUMN customer_id SET DEFAULT nextval('sales_customers_customer_id_seq');
        ALTER SEQUENCE sales_customers_customer_id_seq OWNED BY sales_customers.customer_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_suppliers' AND column_name='supplier_id') THEN
        CREATE SEQUENCE IF NOT EXISTS sales_suppliers_supplier_id_seq;
        EXECUTE 'SELECT setval(''sales_suppliers_supplier_id_seq'', COALESCE((SELECT MAX(supplier_id) FROM sales_suppliers), 0) + 1, false)';
        ALTER TABLE sales_suppliers ALTER COLUMN supplier_id SET DEFAULT nextval('sales_suppliers_supplier_id_seq');
        ALTER SEQUENCE sales_suppliers_supplier_id_seq OWNED BY sales_suppliers.supplier_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_franchises' AND column_name='franchise_id') THEN
        CREATE SEQUENCE IF NOT EXISTS sales_franchises_franchise_id_seq;
        EXECUTE 'SELECT setval(''sales_franchises_franchise_id_seq'', COALESCE((SELECT MAX(franchise_id) FROM sales_franchises), 0) + 1, false)';
        ALTER TABLE sales_franchises ALTER COLUMN franchise_id SET DEFAULT nextval('sales_franchises_franchise_id_seq');
        ALTER SEQUENCE sales_franchises_franchise_id_seq OWNED BY sales_franchises.franchise_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_transactions' AND column_name='transaction_id') THEN
        CREATE SEQUENCE IF NOT EXISTS sales_transactions_transaction_id_seq;
        EXECUTE 'SELECT setval(''sales_transactions_transaction_id_seq'', COALESCE((SELECT MAX(transaction_id) FROM sales_transactions), 0) + 1, false)';
        ALTER TABLE sales_transactions ALTER COLUMN transaction_id SET DEFAULT nextval('sales_transactions_transaction_id_seq');
        ALTER SEQUENCE sales_transactions_transaction_id_seq OWNED BY sales_transactions.transaction_id;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='media_gold_reviews_chunked' AND column_name='chunk_id') THEN
        ALTER TABLE media_gold_reviews_chunked ALTER COLUMN chunk_id SET DEFAULT gen_random_uuid()::text;
    END IF;
END $$;


-- Drop old positional stored procedure signatures so the names are clean.

DROP PROCEDURE IF EXISTS sp_insert_sales_customers(integer, text, text, text, text, text, text, text, text, text, text, text);
DROP PROCEDURE IF EXISTS sp_update_sales_customers(integer, text, text, text, text, text, text, text, text, text, text, text);
DROP PROCEDURE IF EXISTS sp_delete_sales_customers(integer);
DROP PROCEDURE IF EXISTS sp_insert_sales_suppliers(integer, text, text, text, text, text, text, numeric, numeric, text);
DROP PROCEDURE IF EXISTS sp_update_sales_suppliers(integer, text, text, text, text, text, text, numeric, numeric, text);
DROP PROCEDURE IF EXISTS sp_delete_sales_suppliers(integer);
DROP PROCEDURE IF EXISTS sp_insert_sales_franchises(integer, text, text, text, text, text, text, numeric, numeric, integer);
DROP PROCEDURE IF EXISTS sp_update_sales_franchises(integer, text, text, text, text, text, text, numeric, numeric, integer);
DROP PROCEDURE IF EXISTS sp_delete_sales_franchises(integer);
DROP PROCEDURE IF EXISTS sp_insert_sales_transactions(integer, integer, integer, timestamptz, text, integer, numeric, numeric, text, text);
DROP PROCEDURE IF EXISTS sp_update_sales_transactions(integer, integer, integer, timestamptz, text, integer, numeric, numeric, text, text);
DROP PROCEDURE IF EXISTS sp_delete_sales_transactions(integer);
DROP PROCEDURE IF EXISTS sp_insert_media_customer_reviews(integer, text, integer, timestamptz);
DROP PROCEDURE IF EXISTS sp_update_media_customer_reviews(integer, text, integer, timestamptz);
DROP PROCEDURE IF EXISTS sp_delete_media_customer_reviews(integer);
DROP PROCEDURE IF EXISTS sp_insert_media_gold_reviews_chunked(integer, timestamptz, text, text);
DROP PROCEDURE IF EXISTS sp_update_media_gold_reviews_chunked(text, integer, timestamptz, text, text);
DROP PROCEDURE IF EXISTS sp_delete_media_gold_reviews_chunked(text);
DROP PROCEDURE IF EXISTS sp_insert_users(text, text);
DROP PROCEDURE IF EXISTS sp_update_users(integer, text, text);
DROP PROCEDURE IF EXISTS sp_delete_users(integer);



CREATE OR REPLACE PROCEDURE sp_insert_sales_customers(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_insert_sales_customers', true);

    INSERT INTO sales_customers ("first_name", "last_name", "email_address", "phone_number", "address", "city", "state", "country", "continent", "postal_zip_code", "gender")
    SELECT r.first_name, r.last_name, r.email_address, r.phone_number, r.address, r.city, r.state, r.country, r.continent, r.postal_zip_code, r.gender
    FROM jsonb_to_recordset(rows_json) AS r(customer_id integer, first_name text, last_name text, email_address text, phone_number text, address text, city text, state text, country text, continent text, postal_zip_code text, gender text);
END;
$$;


CREATE OR REPLACE PROCEDURE sp_update_sales_customers(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_update_sales_customers', true);

    UPDATE sales_customers AS t
    SET
        "first_name" = CASE WHEN elem ? 'first_name' THEN (elem->>'first_name')::text ELSE t."first_name" END,
        "last_name" = CASE WHEN elem ? 'last_name' THEN (elem->>'last_name')::text ELSE t."last_name" END,
        "email_address" = CASE WHEN elem ? 'email_address' THEN (elem->>'email_address')::text ELSE t."email_address" END,
        "phone_number" = CASE WHEN elem ? 'phone_number' THEN (elem->>'phone_number')::text ELSE t."phone_number" END,
        "address" = CASE WHEN elem ? 'address' THEN (elem->>'address')::text ELSE t."address" END,
        "city" = CASE WHEN elem ? 'city' THEN (elem->>'city')::text ELSE t."city" END,
        "state" = CASE WHEN elem ? 'state' THEN (elem->>'state')::text ELSE t."state" END,
        "country" = CASE WHEN elem ? 'country' THEN (elem->>'country')::text ELSE t."country" END,
        "continent" = CASE WHEN elem ? 'continent' THEN (elem->>'continent')::text ELSE t."continent" END,
        "postal_zip_code" = CASE WHEN elem ? 'postal_zip_code' THEN (elem->>'postal_zip_code')::text ELSE t."postal_zip_code" END,
        "gender" = CASE WHEN elem ? 'gender' THEN (elem->>'gender')::text ELSE t."gender" END
    FROM jsonb_array_elements(rows_json) AS elem
    WHERE t."customer_id" = (elem->>'customer_id')::integer;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(rows_json) AS elem
        WHERE NOT EXISTS (
            SELECT 1 FROM sales_customers t
            WHERE t."customer_id" = (elem->>'customer_id')::integer
        )
    ) THEN
        RAISE NOTICE 'Some sales_customers update rows did not match an existing customer_id.';
    END IF;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_delete_sales_customers(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_delete_sales_customers', true);

    DELETE FROM sales_customers AS t
    USING jsonb_array_elements(rows_json) AS elem
    WHERE t."customer_id" = (elem->>'customer_id')::integer;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_insert_sales_suppliers(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_insert_sales_suppliers', true);

    INSERT INTO sales_suppliers ("name", "ingredient", "continent", "city", "district", "size", "longitude", "latitude", "approved")
    SELECT r.name, r.ingredient, r.continent, r.city, r.district, r.size, r.longitude, r.latitude, r.approved
    FROM jsonb_to_recordset(rows_json) AS r(supplier_id integer, name text, ingredient text, continent text, city text, district text, size text, longitude numeric, latitude numeric, approved text);
END;
$$;


CREATE OR REPLACE PROCEDURE sp_update_sales_suppliers(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_update_sales_suppliers', true);

    UPDATE sales_suppliers AS t
    SET
        "name" = CASE WHEN elem ? 'name' THEN (elem->>'name')::text ELSE t."name" END,
        "ingredient" = CASE WHEN elem ? 'ingredient' THEN (elem->>'ingredient')::text ELSE t."ingredient" END,
        "continent" = CASE WHEN elem ? 'continent' THEN (elem->>'continent')::text ELSE t."continent" END,
        "city" = CASE WHEN elem ? 'city' THEN (elem->>'city')::text ELSE t."city" END,
        "district" = CASE WHEN elem ? 'district' THEN (elem->>'district')::text ELSE t."district" END,
        "size" = CASE WHEN elem ? 'size' THEN (elem->>'size')::text ELSE t."size" END,
        "longitude" = CASE WHEN elem ? 'longitude' THEN (elem->>'longitude')::numeric ELSE t."longitude" END,
        "latitude" = CASE WHEN elem ? 'latitude' THEN (elem->>'latitude')::numeric ELSE t."latitude" END,
        "approved" = CASE WHEN elem ? 'approved' THEN (elem->>'approved')::text ELSE t."approved" END
    FROM jsonb_array_elements(rows_json) AS elem
    WHERE t."supplier_id" = (elem->>'supplier_id')::integer;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(rows_json) AS elem
        WHERE NOT EXISTS (
            SELECT 1 FROM sales_suppliers t
            WHERE t."supplier_id" = (elem->>'supplier_id')::integer
        )
    ) THEN
        RAISE NOTICE 'Some sales_suppliers update rows did not match an existing supplier_id.';
    END IF;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_delete_sales_suppliers(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_delete_sales_suppliers', true);

    DELETE FROM sales_suppliers AS t
    USING jsonb_array_elements(rows_json) AS elem
    WHERE t."supplier_id" = (elem->>'supplier_id')::integer;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_insert_sales_franchises(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_insert_sales_franchises', true);

    INSERT INTO sales_franchises ("name", "city", "district", "zipcode", "country", "size", "longitude", "latitude", "supplier_id")
    SELECT r.name, r.city, r.district, r.zipcode, r.country, r.size, r.longitude, r.latitude, r.supplier_id
    FROM jsonb_to_recordset(rows_json) AS r(franchise_id integer, name text, city text, district text, zipcode text, country text, size text, longitude numeric, latitude numeric, supplier_id integer);
END;
$$;


CREATE OR REPLACE PROCEDURE sp_update_sales_franchises(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_update_sales_franchises', true);

    UPDATE sales_franchises AS t
    SET
        "name" = CASE WHEN elem ? 'name' THEN (elem->>'name')::text ELSE t."name" END,
        "city" = CASE WHEN elem ? 'city' THEN (elem->>'city')::text ELSE t."city" END,
        "district" = CASE WHEN elem ? 'district' THEN (elem->>'district')::text ELSE t."district" END,
        "zipcode" = CASE WHEN elem ? 'zipcode' THEN (elem->>'zipcode')::text ELSE t."zipcode" END,
        "country" = CASE WHEN elem ? 'country' THEN (elem->>'country')::text ELSE t."country" END,
        "size" = CASE WHEN elem ? 'size' THEN (elem->>'size')::text ELSE t."size" END,
        "longitude" = CASE WHEN elem ? 'longitude' THEN (elem->>'longitude')::numeric ELSE t."longitude" END,
        "latitude" = CASE WHEN elem ? 'latitude' THEN (elem->>'latitude')::numeric ELSE t."latitude" END,
        "supplier_id" = CASE WHEN elem ? 'supplier_id' THEN (elem->>'supplier_id')::integer ELSE t."supplier_id" END
    FROM jsonb_array_elements(rows_json) AS elem
    WHERE t."franchise_id" = (elem->>'franchise_id')::integer;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(rows_json) AS elem
        WHERE NOT EXISTS (
            SELECT 1 FROM sales_franchises t
            WHERE t."franchise_id" = (elem->>'franchise_id')::integer
        )
    ) THEN
        RAISE NOTICE 'Some sales_franchises update rows did not match an existing franchise_id.';
    END IF;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_delete_sales_franchises(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_delete_sales_franchises', true);

    DELETE FROM sales_franchises AS t
    USING jsonb_array_elements(rows_json) AS elem
    WHERE t."franchise_id" = (elem->>'franchise_id')::integer;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_insert_sales_transactions(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_insert_sales_transactions', true);

    INSERT INTO sales_transactions ("customer_id", "franchise_id", "date_time", "product", "quantity", "unit_price", "total_price", "payment_method", "card_number")
    SELECT r.customer_id, r.franchise_id, r.date_time, r.product, r.quantity, r.unit_price, r.total_price, r.payment_method, r.card_number
    FROM jsonb_to_recordset(rows_json) AS r(transaction_id integer, customer_id integer, franchise_id integer, date_time timestamptz, product text, quantity integer, unit_price numeric, total_price numeric, payment_method text, card_number text);
END;
$$;


CREATE OR REPLACE PROCEDURE sp_update_sales_transactions(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_update_sales_transactions', true);

    UPDATE sales_transactions AS t
    SET
        "customer_id" = CASE WHEN elem ? 'customer_id' THEN (elem->>'customer_id')::integer ELSE t."customer_id" END,
        "franchise_id" = CASE WHEN elem ? 'franchise_id' THEN (elem->>'franchise_id')::integer ELSE t."franchise_id" END,
        "date_time" = CASE WHEN elem ? 'date_time' THEN (elem->>'date_time')::timestamptz ELSE t."date_time" END,
        "product" = CASE WHEN elem ? 'product' THEN (elem->>'product')::text ELSE t."product" END,
        "quantity" = CASE WHEN elem ? 'quantity' THEN (elem->>'quantity')::integer ELSE t."quantity" END,
        "unit_price" = CASE WHEN elem ? 'unit_price' THEN (elem->>'unit_price')::numeric ELSE t."unit_price" END,
        "total_price" = CASE WHEN elem ? 'total_price' THEN (elem->>'total_price')::numeric ELSE t."total_price" END,
        "payment_method" = CASE WHEN elem ? 'payment_method' THEN (elem->>'payment_method')::text ELSE t."payment_method" END,
        "card_number" = CASE WHEN elem ? 'card_number' THEN (elem->>'card_number')::text ELSE t."card_number" END
    FROM jsonb_array_elements(rows_json) AS elem
    WHERE t."transaction_id" = (elem->>'transaction_id')::integer;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(rows_json) AS elem
        WHERE NOT EXISTS (
            SELECT 1 FROM sales_transactions t
            WHERE t."transaction_id" = (elem->>'transaction_id')::integer
        )
    ) THEN
        RAISE NOTICE 'Some sales_transactions update rows did not match an existing transaction_id.';
    END IF;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_delete_sales_transactions(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_delete_sales_transactions', true);

    DELETE FROM sales_transactions AS t
    USING jsonb_array_elements(rows_json) AS elem
    WHERE t."transaction_id" = (elem->>'transaction_id')::integer;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_insert_media_customer_reviews(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_insert_media_customer_reviews', true);

    INSERT INTO media_customer_reviews ("review", "franchise_id", "review_date")
    SELECT r.review, r.franchise_id, r.review_date
    FROM jsonb_to_recordset(rows_json) AS r(new_id integer, review text, franchise_id integer, review_date timestamptz);
END;
$$;


CREATE OR REPLACE PROCEDURE sp_update_media_customer_reviews(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_update_media_customer_reviews', true);

    UPDATE media_customer_reviews AS t
    SET
        "review" = CASE WHEN elem ? 'review' THEN (elem->>'review')::text ELSE t."review" END,
        "franchise_id" = CASE WHEN elem ? 'franchise_id' THEN (elem->>'franchise_id')::integer ELSE t."franchise_id" END,
        "review_date" = CASE WHEN elem ? 'review_date' THEN (elem->>'review_date')::timestamptz ELSE t."review_date" END
    FROM jsonb_array_elements(rows_json) AS elem
    WHERE t."new_id" = (elem->>'new_id')::integer;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(rows_json) AS elem
        WHERE NOT EXISTS (
            SELECT 1 FROM media_customer_reviews t
            WHERE t."new_id" = (elem->>'new_id')::integer
        )
    ) THEN
        RAISE NOTICE 'Some media_customer_reviews update rows did not match an existing new_id.';
    END IF;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_delete_media_customer_reviews(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_delete_media_customer_reviews', true);

    DELETE FROM media_customer_reviews AS t
    USING jsonb_array_elements(rows_json) AS elem
    WHERE t."new_id" = (elem->>'new_id')::integer;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_insert_media_gold_reviews_chunked(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_insert_media_gold_reviews_chunked', true);

    INSERT INTO media_gold_reviews_chunked ("franchise_id", "review_date", "chunked_text", "review_uri")
    SELECT r.franchise_id, r.review_date, r.chunked_text, r.review_uri
    FROM jsonb_to_recordset(rows_json) AS r(chunk_id text, franchise_id integer, review_date timestamptz, chunked_text text, review_uri text);
END;
$$;


CREATE OR REPLACE PROCEDURE sp_update_media_gold_reviews_chunked(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_update_media_gold_reviews_chunked', true);

    UPDATE media_gold_reviews_chunked AS t
    SET
        "franchise_id" = CASE WHEN elem ? 'franchise_id' THEN (elem->>'franchise_id')::integer ELSE t."franchise_id" END,
        "review_date" = CASE WHEN elem ? 'review_date' THEN (elem->>'review_date')::timestamptz ELSE t."review_date" END,
        "chunked_text" = CASE WHEN elem ? 'chunked_text' THEN (elem->>'chunked_text')::text ELSE t."chunked_text" END,
        "review_uri" = CASE WHEN elem ? 'review_uri' THEN (elem->>'review_uri')::text ELSE t."review_uri" END
    FROM jsonb_array_elements(rows_json) AS elem
    WHERE t."chunk_id" = (elem->>'chunk_id')::text;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(rows_json) AS elem
        WHERE NOT EXISTS (
            SELECT 1 FROM media_gold_reviews_chunked t
            WHERE t."chunk_id" = (elem->>'chunk_id')::text
        )
    ) THEN
        RAISE NOTICE 'Some media_gold_reviews_chunked update rows did not match an existing chunk_id.';
    END IF;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_delete_media_gold_reviews_chunked(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_delete_media_gold_reviews_chunked', true);

    DELETE FROM media_gold_reviews_chunked AS t
    USING jsonb_array_elements(rows_json) AS elem
    WHERE t."chunk_id" = (elem->>'chunk_id')::text;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_insert_users(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_insert_users', true);

    INSERT INTO users ("name", "email")
    SELECT r.name, r.email
    FROM jsonb_to_recordset(rows_json) AS r(id integer, name text, email text);
END;
$$;


CREATE OR REPLACE PROCEDURE sp_update_users(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_update_users', true);

    UPDATE users AS t
    SET
        "name" = CASE WHEN elem ? 'name' THEN (elem->>'name')::text ELSE t."name" END,
        "email" = CASE WHEN elem ? 'email' THEN (elem->>'email')::text ELSE t."email" END
    FROM jsonb_array_elements(rows_json) AS elem
    WHERE t."id" = (elem->>'id')::integer;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(rows_json) AS elem
        WHERE NOT EXISTS (
            SELECT 1 FROM users t
            WHERE t."id" = (elem->>'id')::integer
        )
    ) THEN
        RAISE NOTICE 'Some users update rows did not match an existing id.';
    END IF;
END;
$$;


CREATE OR REPLACE PROCEDURE sp_delete_users(
    IN rows_json jsonb,
    IN modified_by text DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user', COALESCE(modified_by, current_user), true);
    PERFORM set_config('app.change_source', 'node_api:sp_delete_users', true);

    DELETE FROM users AS t
    USING jsonb_array_elements(rows_json) AS elem
    WHERE t."id" = (elem->>'id')::integer;
END;
$$;
