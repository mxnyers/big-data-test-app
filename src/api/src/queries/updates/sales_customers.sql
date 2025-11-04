UPDATE samples.bakehouse.sales_customers
SET
  first_name = COALESCE(${first_name}, first_name),
  last_name = COALESCE(${last_name}, last_name),
  email_address = COALESCE(${email_address}, email_address),
  phone_number = COALESCE(${phone_number}, phone_number),
  address = COALESCE(${address}, address),
  city = COALESCE(${city}, city),
  state = COALESCE(${state}, state),
  country = COALESCE(${country}, country),
  postal_zip_code = COALESCE(${postal_zip_code}, postal_zip_code),
  gender = COALESCE(${gender}, gender)
WHERE customerID = ${customerID};