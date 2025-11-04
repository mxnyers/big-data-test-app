SELECT
  customerID,
  first_name,
  last_name,
  email_address,
  phone_number,
  address,
  city,
  state,
  country,
  postal_zip_code,
  gender
FROM samples.bakehouse.sales_customers
ORDER BY customerID
LIMIT 250;