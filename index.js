const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;
 
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json())


async function verifyToken(req, res, next) {
    if(req.headers?.authorization?.startsWith('Bearer ')){
      const token = req.headers.authorization.split(' ')[1];

      try{
          const decodedUser = await admin.auth().verifyIdToken(token);
          req.decodedEmail = decodedUser.email;
      }
      catch{

      }
    }
    next()
}

// mongodb connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ncbah.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
 
async function run() {
    try{
        await client.connect();
        const database = client.db('winged_wheels');
        const productsCollection = database.collection("products");
        const purchasesCollection = database.collection('purchases');
        const usersCollection = database.collection('users');
        const reviewsCollection = database.collection('reviews');


        // add product
        app.post("/addProducts", async(req, res) => {
        const result = await productsCollection.insertOne(req.body);
        res.send(result);
        }); 

        // get products
          app.get("/products", async (req, res) => {
            const result = await productsCollection.find({}).toArray();
            res.send(result);
        });

        // get single product
        app.get("/singleProduct/:id", async(req, res) => {
          const result = await productsCollection
              .find({_id: ObjectId(req.params.id)})
              .toArray();
          res.send(result[0]);
        });     

        // add purchase
        app.post('/addPurchase', async (req, res) => {
          const purchase = req.body;
          const result = await purchasesCollection.insertOne(purchase);
          res.json(result);
        })

        // get purchases
        app.get('/purchases',async (req, res) => {
         
            const cursor = purchasesCollection.find({})
            const purchases = await cursor.toArray();
            res.json(purchases)
  
        })


        // myOrder confirmation
          app.get("/myPurchase/:email", async (req, res) => {
            const result = await purchasesCollection
                .find({ email: req.params.email })
                .toArray();
                res.send(result); 
        });

        // delete 
          app.delete("/delete/:id", async (req, res) => {
            const result = await  purchasesCollection.deleteOne({_id: ObjectId(req.params.id)});
            const result1 = await  productsCollection.deleteOne({_id: ObjectId(req.params.id)});
            res.send(result);
            res.send(result1);
        });
            // manage purchase
              app.get("/managePurchase", async(req, res) => {
                const result = await purchasesCollection.find({}).toArray();
                res.send(result);
            });

            // add reviews
            app.post('/addReviews', async(req, res) => {
              const review = req.body;
              const result = await reviewsCollection.insertOne(review);
              console.log(result);
              res.json(result);
            })

        // get reviews
           app.get("/reviews", async (req, res) => {
              const result = await reviewsCollection.find({}).toArray();
              res.send(result);
              });          

            //update status
              app.put("/updateStatus/:id", (req, res) => {
                const id = req.params.id;
                const updateStatus = req.body.status;
                const filter = { _id: ObjectId(id)};
                console.log(updateStatus);
                purchasesCollection.updateOne(filter, {
                    $set: {status: updateStatus},
                })
                .then(result => {
                    res.send(result);
                });

            })

            // Users
            app.post('/users', async(req, res) => {
              const user = req.body;
              const result = await usersCollection.insertOne(user);
              console.log(result);
              res.json(result);
            })


            app.put('/users', async (req, res) => {
              const user = req.body;
              const filter = {email:user.email};
              const options = { upsert: true };
              const updateDoc = { $set: user};
              const result = await usersCollection.updateOne(filter, updateDoc, options);
              res.json(result);
            })

            // justify admin 
            app.get('/users/:email', async (req, res) => {
              const email = req.params.email;
              const query = {email: email};
              const user = await usersCollection.findOne(query);
              let isAdmin = false;
              if (user?.role === 'admin') {
                isAdmin = true;
              }
              res.json({ admin: isAdmin});
            })

            // justify admin using jwt token
            app.put('/users/admin', verifyToken, async (req, res) => {
              const user = req.body;
              const requester = req.decodedEmail;
              if(requester) {
                const requesterAccount = await usersCollection.findOne({email: requester});
                if(requesterAccount.role === 'admin'){
                  const filter = {email: user.email};
                  const updateDoc = { $set: { role: 'admin'}};
                  const result = await usersCollection.updateOne(filter, updateDoc);
                  res.json(result);
                }
              }
              else {
                res.status(403).json({ message: 'You do not hold the right to make an admin'})
              }    
            })
 
    }
    finally {
        // await client.close();
    }
}
 
run().catch(console.dir);
 
app.get('/', (req, res) => {
  res.send('Hello Winged Wheels!')
})
 
app.listen(port, () => {
  console.log(`listening at ${port}`)
})
