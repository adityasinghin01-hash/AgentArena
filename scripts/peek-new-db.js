const mongoose = require('mongoose');
const NEW_URI = 'mongodb+srv://adityavijay3659_db_user:Aditya001188-@ai-agents.lmqq8yy.mongodb.net/agentarena?retryWrites=true&w=majority';

(async () => {
  const conn = await mongoose.createConnection(NEW_URI).asPromise();
  const agents = await conn.db.collection('agents').find({}).toArray();
  const cats = [...new Set(agents.map(a => a.category))];
  console.log('Unique categories:', cats);
  await conn.close();
  process.exit(0);
})();
