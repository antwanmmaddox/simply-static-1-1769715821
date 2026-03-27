exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicApiKey: process.env.SNIPCART_API_KEY,
    }),
  };
};
