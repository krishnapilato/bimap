# BiMap

This is a project born only with the aim of practicing with the technologies of Spring Boot and Angular.

Access to this application is managed by the administrator who, thanks to the UI already implemented to manage users, can create new users, remove or modify the data of existing users. Only the administrators can see the Admin Dashboard button in the main page. 

In the main screen (and the only one at the moment) of the application it is possible to enter data such as geographic information. At the end of the insertion of all the data the user can save the data.
The data is written both to a table and to a CSV file, always accessible from the path C:\BiMap\csv_file.csv.

## Requirements

For building and running the application I strongly recommend you to use: 

- [JDK 26.0.1](https://www.oracle.com/java/technologies/downloads/#java17)
- [Maven 3.9.14](https://maven.apache.org/download.cgi)
- [MySQL Server 9.7.0](https://dev.mysql.com/downloads/mysql/)
- [NodeJS 26.4.0](https://nodejs.org/en/)

## Run Locally

This project for the moment can only be run locally with all the developer tools.

Clone the project with [Git](https://git-scm.com/downloads) or download the project zip and extract it wherever you want in your computer

```bash
  git clone https://github.com/khovakrishna-pilato/first-full-stack-app.git
```

First of all go to the spring-boot folder directory 

```bash
  cd first-full-stack-app-main/spring-boot
```

Start the server if you have Maven installed or go to spring-boot/target and launch JAR file

```bash
  mvn-spring-boot:run
```

Then go to the Angular folder directory 

```bash
  cd first-full-stack-app-main/angular
```

Install dependencies with [NodeJS](https://nodejs.org/en/)

```bash
  npm install
```

Install Angular 22.0.4

```bash
  npm install -g @angular/cli@22.0.4
```

Start the client: the web app will open in the browser 

```bash
  ng serve -o
```

## API Reference

#### Get regions

```http
  GET /regions={keyword}
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `keyword` | `string` | **Required**. Search keyword in regions and return 4 results |

#### Get provinces

```http
  GET /provinces={keyword}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `keyword`      | `string` | **Required**. Search keyword in provinces and return 4 results |

#### Get municipalities

```http
  GET /municipalities={keyword}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `keyword`      | `string` | **Required**. Search keyword in municipalities and return 4 results |

#### Post form model data

```http
  POST /save
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `RequestBody FormModel`      | `FormModel Object` | **Required**. Save the object to form table and to csv_file |

#### Get all data in tables table

```http
  GET /findAll
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `-`      | `-` | Return alla data in tables table |

#### Get all data in users table

```http
  GET /users
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `-`      | `-` | Return alla data in users table |

####  Post user data

```http
  POST /users
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `RequestBody User`      | `User Object` | **Required**. Save the user object to table |

####  Update user data

```http
  PUT /users/{id}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `Long` | **Required**. Update the user with id equal to the path variable |

####  Delete user data

```http
  PUT /users/{id}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `id`      | `Long` | **Required**. Delete the user with id equal to the path variable |


## Technologies used:

- [Leaflet 1.9.4](https://leafletjs.com)
- [Google Maps Data](https://developers.google.com/maps)
