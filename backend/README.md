# BiMap — Backend

The backend service for BiMap, built with Spring Boot. It exposes a RESTful API for geographic data lookups and user management, secured with JWT-based authentication via Spring Security. Data is persisted in MySQL using Spring Data JPA.

## 🛠️ Tech Stack

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.0-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-26-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://www.oracle.com/java)
[![Spring Security](https://img.shields.io/badge/Spring%20Security-6DB33F?style=flat-square&logo=springsecurity&logoColor=white)](https://spring.io/projects/spring-security)
[![Spring Data JPA](https://img.shields.io/badge/Spring%20Data%20JPA-6DB33F?style=flat-square&logo=spring&logoColor=white)](https://spring.io/projects/spring-data-jpa)
[![MySQL](https://img.shields.io/badge/MySQL-9.7.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://dev.mysql.com)
[![Maven](https://img.shields.io/badge/Maven-3.9.14-C71A36?style=flat-square&logo=apachemaven&logoColor=white)](https://maven.apache.org)
[![Lombok](https://img.shields.io/badge/Lombok-red?style=flat-square&logo=java&logoColor=white)](https://projectlombok.org)
[![JWT](https://img.shields.io/badge/JWT-0.13.0-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![Springdoc OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white)](https://springdoc.org)
[![Thymeleaf](https://img.shields.io/badge/Thymeleaf-4.1.0-005F0F?style=flat-square&logo=thymeleaf&logoColor=white)](https://www.thymeleaf.org)
[![Log4j2](https://img.shields.io/badge/Log4j2-4.1.0-CC0000?style=flat-square&logo=apache&logoColor=white)](https://logging.apache.org/log4j/2.x)

## ⚙️ Requirements

| Tool | Version |
|------|---------|
| [JDK](https://www.oracle.com/java/technologies/downloads/) | 26      |
| [Maven](https://maven.apache.org/download.cgi) | 3.9.14  |
| [MySQL Server](https://dev.mysql.com/downloads/mysql/) | 9.7.0   |

## 🚀 Getting Started

### 1. Configure the database

Create a MySQL database and update the connection settings in `src/main/resources/application.properties` (or `application.yml`):

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/bimap
spring.datasource.username=your_username
spring.datasource.******
```

### 2. Build and run

```bash
# From the backend/ directory
mvn spring-boot:run
```

Or build a JAR and run it:

```bash
mvn clean package
java -jar target/demo-1.0.0.jar
```

The server starts at `http://localhost:8080`.

### 3. API Documentation

Interactive Swagger UI is available at:

```
http://localhost:8080/swagger-ui.html
```

## 📡 API Reference

#### Get regions

```http
GET /regions={keyword}
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `keyword` | `string` | **Required**. Search keyword in regions — returns up to 4 results |

#### Get provinces

```http
GET /provinces={keyword}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `keyword` | `string` | **Required**. Search keyword in provinces — returns up to 4 results |

#### Get municipalities

```http
GET /municipalities={keyword}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `keyword` | `string` | **Required**. Search keyword in municipalities — returns up to 4 results |

#### Save form data

```http
POST /save
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `RequestBody FormModel` | `FormModel` | **Required**. Saves the object to the form table and CSV file |

#### Get all form records

```http
GET /findAll
```

Returns all records in the form data table.

#### Get all users

```http
GET /users
```

Returns all records in the users table.

#### Create user

```http
POST /users
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `RequestBody User` | `User` | **Required**. Saves the user object to the users table |

#### Update user

```http
PUT /users/{id}
```

| Parameter | Type   | Description                       |
| :-------- | :----- | :-------------------------------- |
| `id`      | `Long` | **Required**. Update the user with the given id |

#### Delete user

```http
DELETE /users/{id}
```

| Parameter | Type   | Description                       |
| :-------- | :----- | :-------------------------------- |
| `id`      | `Long` | **Required**. Delete the user with the given id |

## 🗂️ Project Structure

```
backend/
├── src/
│   └── main/
│       ├── java/          # Application source code
│       └── resources/     # Configuration files
└── pom.xml                # Maven build descriptor
```
