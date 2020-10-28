# My World API

# Initial Setup

1. Clone the project. 

2. In the main project directory, install all the required modules.

```
npm install
```
3. If the database is not setup, first complete the steps in the myworld-tooling section and then start the service.

```
npm run startdev

OR

npm start (in production)
```

# myworld-tooling

1. (Optional, but HIGHLY RECOMMENDED) Create a virtual environment. We will use this environment to install python and the required modules.

```
python -m pip install virtualenv
virtualenv my_env
./my_env/bin/activate
```

2. Once the virtual environment is activated, install the python dependencies required by the script.

```
python -m pip install -r requirements.txt
```

3. Postgresql (and pgAdmin) are required. If they are not already installed download them from the Postgres website. Create a database called myworld in pgAdmin.

4. Once this database is created, run the script.

```
python populate_data.py
```
