import mongoose from "mongoose";

mongoose.set('strictQuery', false);

const connectionToDB = async () => { // Corrected syntax for arrow function declaration
    try {
        const { connection } = await mongoose.connect(
            process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms'
        );

        if (connection) {
            console.log(`Connected to MongoDB: ${connection.host}`); // Corrected syntax for string interpolation
        }
    } catch (e) {
        console.log(e); // Removed unnecessary "I" after console.log
        process.exit(1);
    }
};

export default connectionToDB;
