const express = require('express')
const aplicacion = express()
const mysql = require('mysql')
const bodyParser = require('body-parser')
const { query } = require('express')


var pool = mysql.createPool({
  connectionLimit: 20,
  host: 'localhost',
  user: 'antonio',
  password: 'antonio99',
  database: 'blog_viajes'
})

aplicacion.use(bodyParser.json())
aplicacion.use(bodyParser.urlencoded({ extended: true }))


//JSON con todas las publicaciones.

aplicacion.get('/api/v1/publicaciones', function (peticion, respuesta) {
  pool.getConnection(function (err, connection) {
    const query = `SELECT * FROM publicaciones`
    connection.query(query, function (error, filas, campos) {
      respuesta.json({ datos: filas })
    })
    connection.release()
  })
})
//JSON con todas las publicaciones que tengan la palabra <palabra> en el título, contenido o resumen.

aplicacion.get('/api/v1/publicaciones', function (peticion, respuesta) {
  pool.getConnection((err, connection) => {
    const busqueda = (peticion.query.busqueda) ? peticion.query.busqueda : ""
    const query = `
        SELECT * 
        FROM publicaciones
        WHERE
        titulo LIKE '%${busqueda}%' OR
        resumen LIKE '%${busqueda}%' OR
        contenido LIKE '%${busqueda}%'  
      `
    connection.query(query, function (error, filas, campos) {
      if (filas.length > 0) {
        respuesta.json({ datos: filas })
      } else {
        respuesta.status(404)
        respuesta.send({ errors: ["No se encuentra nada relacionado con:" + peticion.query.busqueda] })
      }
    })
    connection.release()
  })
})

//Publicación con id = <id>. Considera cuando el id no existe.

aplicacion.get('/api/v1/publicaciones/:id', function (peticion, respuesta) {
  pool.getConnection(function (err, connection) {
    const query = `SELECT * FROM publicaciones WHERE id=${connection.escape(peticion.params.id)}`
    connection.query(query, function (error, filas, campos) {
      if (filas.length > 0) {
        respuesta.json({ datos: filas[0] })
      }
      else {
        respuesta.status(404)
        respuesta.send({ errors: ["No se encuentra la publicación con el id:" + `${connection.escape(peticion.params.id)}`] })
      }
    })
    connection.release()
  })
})

//JSON con todos los autores.

aplicacion.get('/api/v1/autores', function (peticion, respuesta) {
  pool.getConnection(function (err, connection) {
    const query = `SELECT * FROM autores`
    connection.query(query, function (error, filas, campos) {
      respuesta.json({ datos: filas })
    })
    connection.release()
  })
})
//JSON con la información del autor con id = <id> y este contiene sus publicaciones. Considera cuando el id no existe.

aplicacion.get('/api/v1/autores/:id', function (peticion, respuesta) {
  pool.getConnection(function (err, connection) {
    const query =
      `SELECT *
      FROM autores 
      INNER JOIN publicaciones
      ON autores.id = publicaciones.autor_id 
      WHERE autores.id = ${connection.escape(peticion.params.id)}`
    connection.query(query, function (error, filas, campos) {
      if (filas.length > 0) {
        respuesta.json({ datos: filas })
      }
      else {
        respuesta.status(404)
        respuesta.send({ errors: ["No se encuentra el autor con el id:" + `${connection.escape(peticion.params.id)}`] })
      }
    })
    connection.release()
  })
})

//Crea un autor dado un pseudónimo, email, contraseña. Validar peticiones con pseudónimos duplicados o email duplicados. Devuelve un JSON con el objeto creado.

aplicacion.post('/api/v1/autores/', (peticion, respuesta) => {
  pool.getConnection((err, connection) => {
    const consultaPseudonimo =
      `SELECT pseudonimo FROM autores
       WHERE pseudonimo = ${connection.escape(peticion.body.pseudonimo)}
     `
    connection.query(consultaPseudonimo, function (error, filas, campos) {
      if (filas.length > 0) {
        respuesta.send({ errors: ["El Pseudonimo:" + `${connection.escape(peticion.body.pseudonimo)}` + "ya existe intenta con otro"] })
      } else {
        const consultaEmail =
          `SELECT email FROM autores
           WHERE email = ${connection.escape(peticion.body.email)}
          `
        connection.query(consultaEmail, function (error, filas, campos) {
          if (filas.length > 0) {
            respuesta.send({ errors: ["El email:" + `${connection.escape(peticion.body.email)}` + "ya existe intenta con otro"] })
          } else {
            const query = `INSERT INTO autores 
                      (email, contrasena, pseudonimo) 
                      VALUES (${connection.escape(peticion.body.email)},
                              ${connection.escape(peticion.body.contrasena)},
                              ${connection.escape(peticion.body.pseudonimo)})`
            connection.query(query, function (error, filas, campos) {
              const nuevoId = filas.insertId
              const queryConsulta = `SELECT * FROM autores WHERE id=${connection.escape(nuevoId)}`
              connection.query(queryConsulta, function (error, filas, campos) {
                respuesta.status(201)
                respuesta.json({ datos: filas[0] })
              })
            })
          }
        })
      }
    })
    connection.release()
  })
})

// Crea una publicación para el usuario con <email> = email,si este se puede validar correctamente con la contraseña. Se le envía un título, resumen y contenido. Devuelve un JSON con el objeto creado.

aplicacion.post('/api/v1/publicaciones', function (peticion, respuesta) {
  pool.getConnection((err, connection) => {
    const date = new Date()
    const fecha = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    const email = (peticion.query.email) ? peticion.query.email : ""
    const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""
    const consulta = `
      SELECT *
      FROM autores
      WHERE
      email = '${email}'AND 
      contrasena = '${contrasena}'`
    connection.query(consulta, (error, filas, campos) => {
      if (filas.length > 0) {
        const query = `INSERT INTO publicaciones
                       (titulo, resumen, contenido, autor_id, fecha_hora)
                       VALUES (
                      ${connection.escape(peticion.body.titulo)},
                      ${connection.escape(peticion.body.resumen)},
                      ${connection.escape(peticion.body.contenido)},
                      ${connection.escape(filas[0].id)},
                      ${connection.escape(fecha)}
                      )`
        connection.query(query, (error, filas, campos) => {
          const nuevoId = filas.insertId
          const queryConsulta = `SELECT * FROM publicaciones WHERE id=${connection.escape(nuevoId)}`
          connection.query(queryConsulta, function (error, filas, campos) {
            respuesta.status(201)
            respuesta.json({ datos: filas[0] })
          })
        })
      } else {
        respuesta.send({ errors: ["Datos incorrectos intenta de nuevo"] })
      }
    })
    connection.release()
  })
})

aplicacion.delete('/api/v1/publicaciones/:id', function (peticion, respuesta) {
  pool.getConnection((err, connection) => {
    const email = (peticion.query.email) ? peticion.query.email : ""
    const contrasena = (peticion.query.contrasena) ? peticion.query.contrasena : ""
    const consulta = `
      SELECT *
      FROM autores
      WHERE
      email = '${email}'AND 
      contrasena = '${contrasena}'`
    connection.query(consulta, (error, filas, campos) => {
      if (filas.length > 0) {
        const query =
          `SELECT *
            FROM publicaciones 
            WHERE id = ${connection.escape(peticion.params.id)} AND
            autor_id = ${connection.escape(filas[0].id)}`
        connection.query(query, function (error, filas, campos) {
          if (filas.length > 0) {
            //respuesta.json({ datos: filas })
            const query =
            `DELETE FROM publicaciones WHERE id = ${connection.escape(peticion.params.id)}`
            connection.query(query, function (error, filas, campos) {
              respuesta.send({ Delete: ["Se elimino la publicacion con id:"+ `${connection.escape(peticion.params.id)}` ] })
            })
          }else{
            respuesta.send({ errors: ["La publicación que quieres eliminar no existe o ya fue eliminada"] })
          }
        })
      }else{
        respuesta.send({ errors: ["Datos personales incorrectos intenta de nuevo"] })
      }
    })
    connection.release()
  })
})


aplicacion.listen(8080, function () {
  console.log("Servidor iniciado")
})
