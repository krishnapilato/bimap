# Map WebApp Exercise

This is a project born only with the aim of practicing with the technologies of Spring Boot and Angular.
The user can enter the required data such as the region and the name of the property. There is also a map created thanks to Leaflet where for the moment it can only 'play', but its usefulness is expected very soon.

I'm trying to create a login, registration and forgotten password page so that the web app is as safe as possible.
 Also a way is in development to make my three API secure with API Key that will allow them to be used.
 
## Requirements

For building and running the application you need:

- [JDK 17](https://www.oracle.com/java/technologies/downloads/#java17)
- [Maven 3.8.5](https://maven.apache.org/download.cgi)
- [MySQL Server 8.0.29](https://dev.mysql.com/downloads/mysql/)

## Run Locally

Clone the project

```bash
  git clone https://github.com/khovakrishna-pilato/first-full-stack-app.git
```

First of all go to the spring-boot folder directory 

```bash
  cd first-full-stack-app-main/spring-boot
```

Start the server

```bash
  mvn-spring-boot:run
```

Then go to the angular folder directory 

```bash
  cd first-full-stack-app-main/angular
```

Install dependencies

```bash
  npm install
```

Start the client: the web app will open in the browser 

```bash
  npm serve -o
```

## API Reference

#### Get regions

```http
  GET /searchRegion={keyword}
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `keyword` | `string` | **Required**. Search keyword in regions and return 4 results |

#### Get provinces

```http
  GET /searchProvince={keyword}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `keyword`      | `string` | **Required**. Search keyword in provinces and return 4 results |

#### Get municipalities

```http
  GET /searchMunicipality={keyword}
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
| `@RequestBody`      | `FormData Object` | **Required**. Save the object to form table and to csv_file |

## Technologies used:

- [Leaflet](https://leafletjs.com)
- [Google Maps Data](https://developers.google.com/maps)
