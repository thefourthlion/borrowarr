#!/usr/bin/env python3

import os.path
from os import path
import os

# ----------------------------------------- Set according to directory - var ----------------------------
current_path = os.getcwd()


# ------------------------------------------- Global Variables ---------------------------------------------
users_choice = "yes"
db_items = []


# ------------------------------------------------------ functions -----------------------------------------------
def create_config_files():
    config_file = '''const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    await sequelize.sync();
    console.log('✅ Database synchronized');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, connectDB };'''
    config_file_path = config_directory + "/database.js"
    try:
        print("🛑 tried")
        write_to_file(config_file_path, config_file)
        return print("Config Files Successfully Created...")
    except:
        return print("Something Went Wrong When Creating Config Files...")

def create_controller_files(name, *args):
    controller_first = f'const {name} = require("../models/{name}"); exports.create{name} = async (req, res) => {{  try {{ const new{name} = await {name}.create({{'
    controller_second = []
    controller_third = f' }}); res.status(201).json(new{name}); }} catch (err) {{ console.log(err); res.status(500).json({{ error: err.message }}); }} }}; exports.read{name} = async (req, res) => {{ const page = parseInt(req.query.page) || 0; const limit = parseInt(req.query.limit) || 25; const offset = page * limit; try {{ const result = await {name}.findAndCountAll({{ limit, offset, order: [["createdAt", "DESC"]] }}); res.json({{ data: result.rows, total: result.count, page, limit }}); }} catch (err) {{ console.log(err); res.status(500).json({{ error: err.message }}); }} }}; exports.read{name}FromID = async (req, res) => {{ try {{ const result = await {name}.findByPk(req.params.id); if (!result) {{ return res.status(404).json({{ error: "Record not found" }}); }} res.json(result); }} catch (err) {{ console.log(err); res.status(500).json({{ error: err.message }}); }} }}; exports.update{name} = async (req, res) => {{ try {{ const [updated] = await {name}.update({{'
    controller_fourth = []
    controller_fifth = f' }}, {{ where: {{ id: req.params.id }}, returning: true }}); if (updated === 0) {{ return res.status(404).json({{ error: "Record not found" }}); }} const result = await {name}.findByPk(req.params.id); res.json(result); }} catch (err) {{ console.log(err); res.status(500).json({{ error: err.message }}); }} }}; exports.delete{name} = async (req, res) => {{ try {{ const deleted = await {name}.destroy({{ where: {{ id: req.params.id }} }}); if (deleted === 0) {{ return res.status(404).json({{ error: "Record not found" }}); }} res.json({{ message: "Record deleted successfully" }}); }} catch (err) {{ console.log(err); res.status(500).json({{ error: err.message }}); }} }};'
    controller_file_path = controller_directory + f'/{name}.js'
    for arg in args:
        for a in arg:
            file = f'{a}: req.body.{a},'
            controller_second.append(file)
            controller_fourth.append(file)   
    try:
        entire_file = controller_first + ''.join(controller_second) + controller_third + ''.join(controller_fourth) + controller_fifth
        write_to_file(controller_file_path, entire_file)
        return print("Controller Files Successfully Created...")
    except:
        return print("Something Went Wrong When Creating Controller Files...")

def create_models_files(name, *args):
    models_file_first = f'const {{ DataTypes }} = require("sequelize"); const {{ sequelize }} = require("../config/database"); const {name} = sequelize.define("{name}", {{'
    models_file_middle = []
    models_file_last = f' }}, {{ tableName: "{name.lower()}s", timestamps: true }}); module.exports = {name};'
    models_file_path = model_directory + f'/{name}.js'
    for arg in args:
        for a in arg:
            middle = f'{a}: {{ type: DataTypes.STRING, allowNull: false, validate: {{ notEmpty: {{ msg: "Please provide {a}" }} }} }},'
            models_file_middle.append(middle)
    try:
        middle_file = ''.join(models_file_middle)
        entire_file = models_file_first + middle_file + models_file_last
        write_to_file(models_file_path, entire_file)
        return print("Models Files Successfully Created...")
    except:
        return print("Something Went Wrong When Creating Model Files...")


def create_routes_files(name):
    routes_file = f'const express = require("express"); const router = express.Router(); const {{ create{name}, read{name}, read{name}FromID, update{name}, delete{name} }} = require("../controllers/{name}"); router.route("/create").post(create{name}); router.route("/read").get(read{name}); router.route("/read/:id").get(read{name}FromID); router.route("/update/:id").put(update{name}); router.route("/delete/:id").delete(delete{name}); module.exports = router;'
    routes_file_path = route_directory + f'/{name}.js'
    try:
        write_to_file(routes_file_path, routes_file)
        return print("Routes Files Successfully Created...")
    except:
        return print("Something Went Wrong When Creating Routes Files...")
        
def create_index_file(name):
    index_file = f'''const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 3002;
const {{ connectDB }} = require("./config/database");
require("dotenv").config({{ path: "./.env" }});

app.use(express.json());
app.use(express.urlencoded({{ extended: false }}));
app.use(cors());

// Connect to database
connectDB();

app.get("/", (req, res) => {{
  res.json({{ app: "running" }});
}});

// Routes
app.use("/api/{name}", require("./routes/{name}"));

app.listen(PORT, () => {{
  console.log("✅ Listening on port " + PORT);
}});'''
    index_file_path = f'{current_path}/index.js'
    
    if path.exists("./index.js"):
        print("index.js file already exists...Appending route...")
        with open("./index.js", "a") as index_file:
            index_file.write(f'\napp.use("/api/{name}", require("./routes/{name}"));')
    else:
        write_to_file(index_file_path, index_file)
        return print("index.js Files Successfully Created...")

def create_package_file():
    package_file = '''{
  "name": "generate-sqlite-server",
  "version": "1.0.0",
  "description": "Auto-generated SQLite Node.js server",
  "main": "index.js",
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1",
    "start": "nodemon index.js",
    "dev": "nodemon index.js",
    "postinstall": "npm rebuild sqlite3 || echo 'Please run: npm rebuild sqlite3'"
  },
  "pnpm": {
    "onlyBuiltDependencies": ["sqlite3"]
  },
  "keywords": ["sqlite", "express", "sequelize"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "nodemon": "^3.0.1",
    "sequelize": "^6.32.1",
    "sqlite3": "^5.1.7"
  }
}'''
    package_file_path = current_path + '/package.json'
    try:
        write_to_file(package_file_path, package_file)
        return print("Package Files Successfully Created...")
    except:
        return print("Something Went Wrong When Creating Package Files...")

def write_to_file(path, content):
    file = open(path, "w", encoding="utf-8")
    file.write(content)
    file.close()

def create_env_file():
    env_file = '''PORT=3002'''
    env_file_path = current_path + '/.env'
    if not path.exists(env_file_path):
        try:
            write_to_file(env_file_path, env_file)
            return print(".env File Successfully Created...")
        except:
            return print("Something Went Wrong When Creating .env File...")
    else:
        return print(".env file already exists, skipping...")

def create_npmrc_file():
    npmrc = '''# Enable lifecycle scripts for native modules (pnpm)
enable-pre-post-scripts=true
# Allow build scripts to run
ignored-scripts=false'''
    npmrc_path = current_path + '/.npmrc'
    if not path.exists(npmrc_path):
        try:
            write_to_file(npmrc_path, npmrc)
            return print(".npmrc File Successfully Created...")
        except:
            return print("Something Went Wrong When Creating .npmrc File...")
    else:
        return print(".npmrc file already exists, skipping...")

def create_database_file():
    database_path = current_path + '/database.sqlite'
    if not path.exists(database_path):
        try:
            # Create an empty database file
            with open(database_path, 'w') as db_file:
                db_file.write('')
            return print("database.sqlite Successfully Created...")
        except Exception as e:
            return print(f"Something Went Wrong When Creating database.sqlite: {e}")
    else:
        return print("database.sqlite already exists, skipping...")

def create_docker_files():
    # Dockerfile
    dockerfile = '''FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3002

CMD ["npm", "start"]'''
    dockerfile_path = current_path + '/Dockerfile'
    
    # .dockerignore
    dockerignore = '''node_modules
npm-debug.log
.env
.git
.gitignore
README.md
.DS_Store
coverage
.nyc_output'''
    dockerignore_path = current_path + '/.dockerignore'
    
    files = [
        (dockerfile_path, dockerfile),
        (dockerignore_path, dockerignore)
    ]
    
    for file_path, content in files:
        if not path.exists(file_path):
            try:
                write_to_file(file_path, content)
                print(f"{os.path.basename(file_path)} Successfully Created...")
            except:
                print(f"Something Went Wrong When Creating {os.path.basename(file_path)}...")
        else:
            print(f"{os.path.basename(file_path)} already exists, skipping...")

def create_gitignore():
    gitignore = '''node_modules
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.DS_Store
dist
.vscode/
*.log
coverage/
.idea/
build/
.tmp/
.cache/
database.sqlite'''
    gitignore_path = current_path + '/.gitignore'
    if not path.exists(gitignore_path):
        try:
            write_to_file(gitignore_path, gitignore)
            return print(".gitignore File Successfully Created...")
        except:
            return print("Something Went Wrong When Creating .gitignore File...")
    else:
        return print(".gitignore file already exists, skipping...")

def create_readme_file():
    readme_content = '''# SQLite Node.js Server

Auto-generated Node.js server with SQLite database.

## Features

- Express.js REST API
- SQLite database with Sequelize ORM
- CRUD operations
- Docker support

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Install dependencies:
```bash
# Using npm
npm install

# Using pnpm
pnpm install
pnpm rebuild sqlite3
```

2. Set up environment variables:
Copy `.env` file and update if needed.

3. Start the server:
```bash
npm start
# or
pnpm start
```

### Docker Setup

Run with Docker:
```bash
docker build -t sqlite-server .
docker run -p 3002:3002 sqlite-server
```

## API Endpoints

Your custom model routes will be available at `/api/{model_name}/`

### Standard CRUD Operations
- `POST /api/{model}/create` - Create new record
- `GET /api/{model}/read` - Read all records (with pagination)
- `GET /api/{model}/read/:id` - Read specific record by ID
- `PUT /api/{model}/update/:id` - Update record by ID
- `DELETE /api/{model}/delete/:id` - Delete record by ID

## Environment Variables

- `PORT` - Server port (default: 3002)

## Database

The SQLite database file `database.sqlite` is automatically created in the project root. The database is managed through Sequelize ORM with automatic migrations.

## Troubleshooting

### SQLite3 binding errors with pnpm

If you encounter binding errors after installation:
```bash
pnpm rebuild sqlite3
```
'''
    readme_path = current_path + '/README.md'
    if not path.exists(readme_path):
        try:
            write_to_file(readme_path, readme_content)
            return print("README.md File Successfully Created...")
        except:
            return print("Something Went Wrong When Creating README.md File...")
    else:
        return print("README.md file already exists, skipping...")

# ----------------------------------------- Create folders for all of the files ----------------------------
config_directory = os.path.join(current_path, "config")
controller_directory = os.path.join(current_path, "controllers")
middleware_directory = os.path.join(current_path, "middleware")
model_directory = os.path.join(current_path, "models")
route_directory = os.path.join(current_path, "routes")

print("Creating needed folders...")

directories = [config_directory, controller_directory, middleware_directory, model_directory, route_directory]
directory_names = ["Config", "Controller", "Middleware", "Model", "Route"]

for directory, name in zip(directories, directory_names):
    if os.path.exists(directory):
        print(f"{name} path already exists.")
    else:
        os.mkdir(directory)
        print(f"{name} directory created.")

# ----------------------------------------- Call everything ----------------------------
print("\n🚀 SQLite Node.js Server Generator")
print("=" * 50)

type_of_db = input("What are you storing in the DB? (e.g., Product, User, Post): ")
db_item_amount = input("How many fields do you need in each document? ")

db_items = []
db_item_amount_list = [0] * int(db_item_amount)

print(f"\nEnter {db_item_amount} field names for {type_of_db}:")
for i, item in enumerate(db_item_amount_list, 1):
    db_item_name = input(f"Field {i} name: ")
    db_items.append(db_item_name)

print("\n🔧 Generating your SQLite server...")
print("-" * 40)

print("✅ Adding config files...")
create_config_files()

print("✅ Adding controller files...")
create_controller_files(type_of_db, db_items)

print("✅ Adding route files...")
create_routes_files(type_of_db)

print("✅ Adding model files...")
create_models_files(type_of_db, db_items)

print("✅ Adding index file...")
create_index_file(type_of_db)

print("✅ Adding package.json...")
create_package_file()

print("✅ Adding .env file...")
create_env_file()

print("✅ Adding .npmrc file...")
create_npmrc_file()

print("✅ Creating database.sqlite...")
create_database_file()

print("✅ Adding Docker files...")
create_docker_files()

print("✅ Adding .gitignore...")
create_gitignore()

print("✅ Adding README.md...")
create_readme_file()

print("\n" + "=" * 50)
print("🎉 Your SQLite Node.js App Is Ready!")
print("=" * 50)
print("\nNext steps:")
print("1. Run 'pnpm install' to install dependencies")
print("2. Run 'pnpm rebuild sqlite3' to build native module")
print("3. Run 'pnpm start' to start the server")
print("4. Or use 'docker build -t sqlite-server .' to build with Docker")
print("\n📖 Check README.md for detailed instructions")

