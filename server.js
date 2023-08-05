const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { Configuration, OpenAIApi } = require("openai");
const env = require('dotenv').config();
OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const app = express();
const port = 3003;

const configuration = new Configuration({
    apiKey: OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

app.use(cors());
app.use(express.json());

app.post('/', async (req, res) => {
    // console.log(req.body);
    // console.log(req.body.content);

    const messages = [{
        role: "system",
        content: "The user is going to give you plain text about anything related to what kind of program they want, your goal is to create a COMPLETE program for them. You only get one attempt so make it count!",
        role: "user",
        content: req.body.text
    }];

    const functions = [{
        name: "createProgramAndMovements",
        description: "Create a new program with one or more sessions, where each session consists of one or more movements.",
        parameters: {
            type: "object",
            properties: {
                programName: {type: "string"},
                programDescription: {type: "string"},
                programCategory: {type: "string"},
                session: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: {type: "string"},
                            movements: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        section: {"type": "string"},
                                        movementName: {"type": "string"},
                                        movementDescription: {"type": "string"},
                                        movementLink: {"type": "string"},
                                        typeTracking: {
                                            "type": "object",
                                            "properties": {
                                                "trackingType": {"type": "string", "enum": ["setsreps", "rounds"]},
                                                "sets": {"type": "integer"},
                                                "reps": {"type": "integer"},
                                                "rounds": {"type": "integer"},
                                                "roundMin": {"type": "integer"},
                                                "roundSec": {"type": "integer"},
                                                "restMin": {"type": "integer"},
                                                "restSec": {"type": "integer"},
                                            },
                                            "required": ["trackingType", "sets", "reps", "rounds", "roundMin", "roundSec", "restMin", "restSec"]
                                        },
                                    },
                                    required: ["section", "movementName", "movementDescription", "movementLink", "typeTracking"]
                                }
                            }
                        },
                        required: ["name", "movements"]
                    }
                }
            },
            required: ["programName", "programDescription", "programCategory", "session"]
        }
    }];
    
    const function_to_call = {
        "createProgramAndMovements": createProgramAndMovements,
    }
    
    try {
        const chatCompletion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
            functions: functions,
            function_call: {"name": "createProgramAndMovements"},
        });

        const responseMessage = chatCompletion.data.choices[0].message;
        console.log(responseMessage);

        if (responseMessage.function_call) {
            const function_name = responseMessage.function_call.name;
            const function_args = JSON.parse(responseMessage.function_call.arguments);
            const function_response = function_to_call[function_name](
                function_args.programName,
                function_args.programDescription,
                function_args.programCategory,
                function_args.session,
            );            
        
            res.json(JSON.parse(function_response)); 
            } else {
                res.json(responseMessage); 
            }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interacting with OpenAI API' });
    }
});


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

function createProgramAndMovements(programName, programDescription, programCategory, session) {
    const program = {
        programName: programName,
        programDescription: programDescription,
        programCategory: programCategory,
        session: session.map(sessionItem => ({
            name: sessionItem.name,
            movements: sessionItem.movements.map(movement => ({
                section: movement.section,
                movementName: movement.movementName,
                movementDescription: movement.movementDescription,
                movementLink: movement.movementLink,
                typeTracking: movement.typeTracking
            }))
        }))
    };
    return JSON.stringify(program);
}
