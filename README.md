## Description

Hands on tutorial on implementing REST API web service using NestJS and MongoDB. Implemented swagger and custom request payload validation pipe.
Read more to follow.
https://becomegeeks.com/blog/nestjs-building-a-rest-api-web-service-with-mongodb/

## Installation

```bash
$ npm install
```

## Running the app

```bash
$ npm run start
```

## API Test

```bash
# Create User API
curl --location 'http://localhost:3000/users' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "2eqqe",
    "email": "test02@gmail.com",
    "password": "test0200"
}'

# Retrieve Users API
curl --location --request GET 'http://localhost:3000/users' \
--header 'Content-Type: application/json'
```

## Stay in touch
- Website - [https://becomegeeks.com](https://becomegeeks.com/)
