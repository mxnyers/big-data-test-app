INSERT INTO samples.bakehouse.sales_transactions
(
  transactionID,
  customerID,
  franchiseID,
  dateTime,
  product,
  quantity,
  unitPrice,
  totalPrice,
  paymentMethod,
  cardNumber
)
VALUES
(
  ${transactionID},
  ${customerID},
  ${franchiseID},
  COALESCE(${dateTime}, CURRENT_TIMESTAMP()),
  ${product},
  ${quantity},
  ${unitPrice},
  ${totalPrice},
  ${paymentMethod},
  ${cardNumber}
);