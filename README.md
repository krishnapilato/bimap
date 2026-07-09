# BiMap

A full-stack geographic data management application built with Angular and Spring Boot. Users can enter and save geographic information (regions, provinces, municipalities) which is persisted to a MySQL database. Access is role-based: administrators can manage users via a dedicated dashboard, while regular users can interact with the map form.

## 🖼️ Screenshots

<table>
	<tr>
		<td><img width="100%" alt="Screenshot 1" src="https://github.com/user-attachments/assets/cec8b3b4-4a5f-4efe-83b7-bc794b165113" /></td>
		<td><img width="100%" alt="Screenshot 2" src="https://github.com/user-attachments/assets/dff3409d-a6ef-46e0-b38b-f996a3beffb5" /></td>
	</tr>
	<tr>
		<td><img width="100%" alt="Screenshot 3" src="https://github.com/user-attachments/assets/0e28c7c8-a789-4fc6-9538-04486eeb382b" /></td>
		<td><img width="100%" alt="Screenshot 4" src="https://github.com/user-attachments/assets/d6065408-fce8-4a15-bd2a-6c96d982426c" /></td>
	</tr>
</table>

## 🏆 Lighthouse Scores

| Performance | Accessibility | Best Practices | SEO |
|:-----------:|:-------------:|:--------------:|:---:|
| ![100](https://img.shields.io/badge/100-Performance-brightgreen?style=flat-square&logo=lighthouse&logoColor=white) | ![100](https://img.shields.io/badge/100-Accessibility-brightgreen?style=flat-square&logo=lighthouse&logoColor=white) | ![100](https://img.shields.io/badge/100-Best%20Practices-brightgreen?style=flat-square&logo=lighthouse&logoColor=white) | ![100](https://img.shields.io/badge/100-SEO-brightgreen?style=flat-square&logo=lighthouse&logoColor=white) |

## 🛠️ Tech Stack

### Frontend
[![Angular](https://img.shields.io/badge/Angular-22.0.4-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.8-7952B3?style=flat-square&logo=bootstrap&logoColor=white)](https://getbootstrap.com)
[![Angular Material](https://img.shields.io/badge/Angular%20Material-22.0.2-FF4081?style=flat-square&logo=angular&logoColor=white)](https://material.angular.io)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?style=flat-square&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![RxJS](https://img.shields.io/badge/RxJS-7.8.2-B7178C?style=flat-square&logo=reactivex&logoColor=white)](https://rxjs.dev)
[![Vitest](https://img.shields.io/badge/Vitest-4.1.9-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)
[![Node.js](https://img.shields.io/badge/Node.js-26.4.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)

### Backend
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.0-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-26-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://www.oracle.com/java)
[![Spring Security](https://img.shields.io/badge/Spring%20Security-6DB33F?style=flat-square&logo=springsecurity&logoColor=white)](https://spring.io/projects/spring-security)
[![Spring Data JPA](https://img.shields.io/badge/Spring%20Data%20JPA-6DB33F?style=flat-square&logo=spring&logoColor=white)](https://spring.io/projects/spring-data-jpa)
[![MySQL](https://img.shields.io/badge/MySQL-9.7.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://dev.mysql.com)
[![Maven](https://img.shields.io/badge/Maven-3.9.14-C71A36?style=flat-square&logo=apachemaven&logoColor=white)](https://maven.apache.org)
[![Lombok](https://img.shields.io/badge/Lombok-red?style=flat-square&logo=java&logoColor=white)](https://projectlombok.org)
[![JWT](https://img.shields.io/badge/JWT-0.13.0-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io)
[![Springdoc OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3-6BA539?style=flat-square&logo=openapiinitiative&logoColor=white)](https://springdoc.org)

## ⚙️ Requirements

| Tool | Version |
|------|---------|
| [JDK](https://www.oracle.com/java/technologies/downloads/) | 26 |
| [Maven](https://maven.apache.org/download.cgi) | 3.9.14 |
| [MySQL Server](https://dev.mysql.com/downloads/mysql/) | 9.7.0 |
| [Node.js](https://nodejs.org/en/) | 26.4.0 |

## 🚀 Run Locally

Clone the project:

```bash
git clone https://github.com/krishnapilato/bimap.git
cd bimap
```

### Start the Backend

```bash
cd backend
mvn spring-boot:run
```

The API will be available at `http://localhost:8080`.

### Start the Frontend

```bash
cd frontend
npm install
ng serve -o
```

The app will open automatically at `http://localhost:4200`.

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
