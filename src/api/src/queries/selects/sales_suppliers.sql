SELECT
  supplierID,
  name,
  ingredient,
  continent,
  city,
  district,
  size,
  longitude,
  latitude,
  approved
FROM samples.bakehouse.sales_suppliers
ORDER BY supplierID
LIMIT 250;