# Restauración de la base de datos SaludSystem

Este manual permite restaurar en otra computadora el esquema Oracle utilizado por SaludSystem.

## Archivos necesarios

La carpeta `Database` debe contener:

```text
SaludSystem_20261007_final.dmp
SaludSystem_20261007_final.log
hash.txt
README_RESTAURACION.md
```

El archivo `.dmp` contiene la estructura y los datos. El `.log` registra la exportación y `hash.txt` contiene la firma SHA-256 para verificar la integridad del respaldo.

## Requisitos

- Oracle Database 19c o una versión compatible.
- Una PDB llamada `ORCLPDB`.
- SQL*Plus, Data Pump Import (`impdp`) y SQL Developer.
- El proyecto SaludSystem descargado o clonado.
- Acceso administrativo local para crear carpetas y conectarse como `SYSDBA`.

## 1. Verificar la integridad del respaldo

Abre PowerShell dentro de la carpeta `Database` del proyecto:

```powershell
cd "C:\XamppN\htdocs\SystemSalud\Database"
Get-FileHash ".\SaludSystem_20261007_final.dmp" -Algorithm SHA256
```

El valor de la columna `Hash` debe coincidir exactamente con el registrado en `hash.txt`. Si no coincide, no importes el archivo porque pudo dañarse o modificarse.

## 2. Comprobar las herramientas de Oracle

```powershell
where.exe sqlplus
where.exe impdp
```

Ambos comandos deben devolver la ubicación de los ejecutables. Si no aparecen, utiliza sus rutas completas dentro de la instalación de Oracle.

## 3. Crear una carpeta física para Data Pump

Ejecuta PowerShell como administrador:

```powershell
New-Item -Path "C:\OracleDataPump\SaludSystem" -ItemType Directory -Force
Copy-Item "C:\XamppN\htdocs\SystemSalud\Database\SaludSystem_20261007_final.dmp" -Destination "C:\OracleDataPump\SaludSystem"
```

No uses una carpeta de OneDrive ni un enlace simbólico, porque Oracle puede bloquearla con el error `ORA-48128`.

## 4. Abrir ORCLPDB

Desde PowerShell como administrador:

```powershell
sqlplus / as sysdba
```

Dentro de SQL*Plus:

```sql
SHOW PDBS;
```

Si `ORCLPDB` aparece como `MOUNTED`, ábrela y guarda su estado:

```sql
ALTER PLUGGABLE DATABASE ORCLPDB OPEN;
ALTER PLUGGABLE DATABASE ORCLPDB SAVE STATE;
```

Selecciona el contenedor:

```sql
ALTER SESSION SET CONTAINER = ORCLPDB;
SHOW CON_NAME;
```

El resultado debe ser `ORCLPDB`.

## 5. Crear el usuario SALUDSYSTEM

Comprueba primero si existe:

```sql
SELECT USERNAME FROM DBA_USERS WHERE USERNAME = 'SALUDSYSTEM';
```

En una instalación nueva, si no devuelve filas, créalo. Sustituye `CONTRASENA_LOCAL_SEGURA` por una contraseña propia:

```sql
CREATE USER SALUDSYSTEM IDENTIFIED BY "CONTRASENA_LOCAL_SEGURA"
DEFAULT TABLESPACE USERS
TEMPORARY TABLESPACE TEMP
QUOTA UNLIMITED ON USERS;

GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW, CREATE SEQUENCE,
      CREATE PROCEDURE, CREATE TRIGGER TO SALUDSYSTEM;
```

No elimines un usuario existente sin revisar primero si contiene información.

## 6. Crear el directorio de Oracle

En la misma sesión `SYSDBA` dentro de `ORCLPDB`:

```sql
CREATE OR REPLACE DIRECTORY SALUDSYSTEM_BACKUP AS 'C:\OracleDataPump\SaludSystem';
GRANT READ, WRITE ON DIRECTORY SALUDSYSTEM_BACKUP TO SALUDSYSTEM;
GRANT READ, WRITE ON DIRECTORY SALUDSYSTEM_BACKUP TO SYSTEM;
```

Comprueba:

```sql
SELECT DIRECTORY_NAME, DIRECTORY_PATH
FROM DBA_DIRECTORIES
WHERE DIRECTORY_NAME = 'SALUDSYSTEM_BACKUP';
```

Sal de SQL*Plus:

```sql
EXIT;
```

## 7. Configurar el alias ORCLPDB si fuera necesario

Prueba:

```powershell
tnsping ORCLPDB
```

Si responde `OK`, continúa con la importación. Si devuelve `TNS-03505`, abre `tnsnames.ora` en la carpeta `network\admin` de Oracle y agrega:

```text
ORCLPDB =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = localhost)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ORCLPDB)
    )
  )
```

Guarda y repite `tnsping ORCLPDB`.

## 8. Importar el respaldo

Ejecuta en PowerShell:

```powershell
impdp "SYSTEM@ORCLPDB" DIRECTORY=SALUDSYSTEM_BACKUP DUMPFILE=SaludSystem_20261007_final.dmp LOGFILE=SaludSystem_import.log SCHEMAS=SALUDSYSTEM
```

Cuando solicite una contraseña, utiliza la contraseña administrativa de Oracle para `SYSTEM`, no la contraseña del usuario web `lset`.

La importación correcta debe finalizar con un mensaje similar a:

```text
Job "SYSTEM"."SYS_IMPORT_SCHEMA_01" successfully completed
```

No utilices `TABLE_EXISTS_ACTION=REPLACE` sobre una base con información. Este manual supone un esquema nuevo y vacío.

## 9. Revisar el registro

```powershell
Select-String -Path "C:\OracleDataPump\SaludSystem\SaludSystem_import.log" -Pattern "ORA-|UDE-"
```

La búsqueda debería quedar vacía. Si aparece `ORA-31684` indicando que el usuario ya existe, comprueba que el trabajo haya terminado correctamente; cualquier otro error debe revisarse antes de continuar.

## 10. Validar los datos

Conéctate en SQL Developer con:

```text
Usuario: SALUDSYSTEM
Host: localhost
Puerto: 1521
Tipo: Nombre del servicio
Servicio: ORCLPDB
```

Ejecuta:

```sql
SELECT COUNT(*) AS TOTAL_TABLAS FROM USER_TABLES;

SELECT 'ROL' AS TABLA, COUNT(*) AS REGISTROS FROM ROL
UNION ALL SELECT 'MODULO', COUNT(*) FROM MODULO
UNION ALL SELECT 'ROL_MODULO', COUNT(*) FROM ROL_MODULO
UNION ALL SELECT 'USUARIO', COUNT(*) FROM USUARIO
UNION ALL SELECT 'PACIENTE', COUNT(*) FROM PACIENTE;
```

El respaldo original contenía como referencia:

| Tabla | Registros |
|---|---:|
| ROL | 4 |
| MODULO | 9 |
| ROL_MODULO | 18 |
| USUARIO | 4 |
| PACIENTE | 8 |

Comprueba también secuencias y triggers:

```sql
SELECT SEQUENCE_NAME FROM USER_SEQUENCES ORDER BY SEQUENCE_NAME;
SELECT TRIGGER_NAME, STATUS FROM USER_TRIGGERS ORDER BY TRIGGER_NAME;
```

Los triggers deben aparecer con estado `ENABLED`.

## 11. Configurar la conexión PHP

El archivo local no se descarga desde GitHub porque está protegido por `.gitignore`. Crea:

```text
BackEnd\Config\config.local.php
```

Contenido:

```php
<?php

return [
    'usuario' => 'SALUDSYSTEM',
    'contrasena' => 'CONTRASENA_LOCAL_SEGURA',
    'conexion' => 'localhost:1521/ORCLPDB',
    'charset' => 'AL32UTF8'
];
```

Utiliza la misma contraseña elegida al crear el usuario de Oracle. No subas este archivo a GitHub.

## 12. Probar SaludSystem

1. Inicia Apache en XAMPP.
2. Confirma que Oracle y el listener estén activos.
3. Abre `http://localhost/SystemSalud/login/login.html`.
4. Inicia sesión con un usuario registrado en la tabla `USUARIO`.
5. Comprueba acceso a Inicio, Pacientes, Citas y los módulos permitidos por el rol.

## Errores frecuentes

| Error | Causa probable | Solución |
|---|---|---|
| `ORA-01109` | `ORCLPDB` está cerrada | Abrirla y ejecutar `SAVE STATE` |
| `ORA-01017` | Usuario, contraseña o contenedor incorrectos | Usar el usuario Oracle correcto y `ORCLPDB` |
| `TNS-03505` | No existe el alias `ORCLPDB` | Agregarlo a `tnsnames.ora` |
| `ORA-39087` | El objeto `DIRECTORY` no existe o no es válido | Crear `SALUDSYSTEM_BACKUP` dentro de `ORCLPDB` |
| `ORA-48128` | La carpeta es un enlace o está dentro de OneDrive | Usar `C:\OracleDataPump\SaludSystem` |
| `ORA-31684` | El objeto ya existe | Importar en un esquema vacío o revisar el objeto existente |

## Seguridad

- No publiques contraseñas de Oracle ni `config.local.php`.
- El `.dmp` contiene datos y hashes de contraseñas de la aplicación.
- No publiques el respaldo si contiene información real de pacientes.
- Utiliza únicamente datos ficticios para repositorios públicos o demostraciones.
