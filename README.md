# Instalación y configuración

Con el fin de facilitar los primeros pasos con esta implementación, a
modo de guía, se realiza un repaso por los requisitos previos a la
instalación del componente.

Además, se ofrece una guía de instalación y configuración, que
simplifica la integración y permite adaptar la solución a las
necesidades concretas del usuario.

## Requisitos previos

A continuación, se describen la lista de requisitos software previos
necesarios para lanzar la solución:

-   **Cuenta de AWS**: Es necesaria de AWS con privilegios, que
    implemente la política de Administrator Access o similares.

-   **Cuenta de Kaggle**: Para que el componente de ingesta pueda
    descargar los datos de Kaggle, es necesario crear cuenta en Kaggle y
    generar unas claves de API que se le proporcionaran al proceso de
    ingesta.

-   **AWS CLI**: Es el conjunto de librerías para trabajar desde consola
    con la cuenta de AWS.

-   **Linux**: Aunque la herramienta de construcción del proyecto esté
    basada en una solución multiplataforma en Javascript, tanto los
    scripts de automatización incluidos en la solución, como las
    pruebas, se han desarrollado en un entorno Linux.

-   **NodeJs**: Es el entorno de central de ejecución que mediante unas
    dependencias despliega el proceso.

-   **Docker**: Es el servicio de virtualización que generara las
    imágenes de los contenedores usados en las ingestas.

## Instalación de los requisitos

A continuación, se hace un repaso por las guías de instalación de las
dependencias del proyecto.

### Creación de las claves de acceso para la cuenta de AWS

Para poder trabajar con la cuenta de AWS mediante programación, es
necesario crear y configurar en la maquina unas claves de acceso que se
realiza desde el portal de AWS.

![Miniatura con la pagina principal del portal de
AWS](img/aws-portal.png){#fig}

Desde la página principal, seleccionamos el servicio de IAM, podemos
apoyarnos en la barra de búsqueda para facilitar el acceso al servicio.

Dentro del servicio en el panel izquierdo desde el desplegable
Administración del acceso seleccionamos Usuarios.

![Miniatura con la página principal de gestión IAM de
usuarios](img/aws-usuarios.png){#fig}

Una vez marcado el usuario sobre el que queremos crear las claves de
acceso, nos vamos a la pestaña de Credenciales de seguridad y generamos
una clave de acceso.

![Miniatura con la página principal del portal de
AWS](img/credenciales.png){#fig}

Una vez generadas las credenciales es necesario guardar de forma segura
las claves, sobre todo la clave de acceso secreta que no puede ser
consultada a posteriori.

![Miniatura con credenciales acceso generadas](img/clave-aws.png){#fig}

Esta miniatura representa un ejemplo con una estructura valida, pero no
representan una clave de acceso real, jamás se debe compartir por
ninguna vía, un error muy típico suele dejarse estas claves hardcodeadas
en repositorios públicos.

Es de vital importancia hacer una gestión muy segura de estas
credenciales, al ser la puerta de acceso a la cuenta, se recomienda
encarecidamente configurar la cuenta para trabajar sobre estas claves
con sesions tokens basados en MFA.

### Creación de las claves de API en Kaggle

Antes de generar las claves de la API de Kaggle, es necesario tener
cuenta en la organización[@wiki:kaggle-website].

Para obtener la cuenta, desde la página <https://www.kaggle.com/> en el
apartado 'Register' podemos crear un usuario siguiendo el procedimiento
estándar mediante email o utilizando 'Single Sign On' con Google de una
manera sencilla.

Una vez registrados, procederemos a realizar el logging. Desde el
apartado account podemos generar las claves de API de la siguiente
manera:

![Miniatura con la creación de las claves de API de
Kaggle](img/generando-claves-kaggle.jpg){#fig}

Una vez creadas estas claves, automáticamente se descargara un fichero
llamado kaggle.json que contiene el user y el key que se proporcionara
al proceso de ingesta para poder comunicarse con la API de Kaggle.

![Miniatura con un ejemplo de claves de API de
Kaggle](img/kaggle-json.jpg){#fig}

### AWS CLI

Tomando como referencia la guía oficial de instalación de AWS
CLI[@wiki:instalacion-aws-cli], para la instalación en plataforma Linux,
simplemente desde un terminal podemos lanzar en bloque los siguiente
comandos:

``` bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"\
-o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

Podemos comprobar que la instalación fue correcta mediante el comando

``` bash
aws --version
```

Una vez instalado correctamente AWS CLI, configuramos las claves
secretas generadas en la cuenta de AWS, lo podemos realizar de forma
simple mediante el siguiente comando:

``` bash
aws configure
```

Al ejecutar el comando, de forma interactiva nos va solicitando la
configuración para la creación de las credenciales. Tomando como ejemplo
las credenciales creados previamente para la región de Irlanda, el flujo
seria el siguiente:

``` bash
$ aws configure
AWS Access Key ID [None]:AKIA5DXJ6ORO3F34ASTT
AWS Secret Access Key [None]: l1kP/o1H1Ha7kzbOQ/Lql/2SGnSqJl6SuYapo2lhe
Default region name [None]: eu-central-1
Default output format [None]: json
```

Podemos comprobar que la instalación se realizó de forma correcta
comprobando que se han generado en el directorio del usuario, los
siguientes ficheros con el siguiente contenido:

1.  \~/.aws/credentials

    ``` bash
    [default]
    aws_access_key_id=AKIA5DXJ6ORO3F34ASTT
    aws_secret_access_key=l1kP/o1H1Ha7kzbOQ/Lql/2SGnSqJl6SuYapo2lhe
    ```

2.  \~/.aws/config

    ``` bash
    [default]
    region=eu-west-1
    output=json
    ```

### Docker

En la documentación oficial de
instalación[@wiki:instalacion-docker-linux], existen multitud de
procedimientos, tomamos la referencia de la instalación desde un paquete
por ser más extensible a la mayoría de distribuciones de linux.

Para la instalación, desde <https://download.docker.com/linux/>,
seleccionamos la distribución, su versión, después tomaremos una versión
de Docker que se quiera instalar, por último, elegimos la plataforma
amd64, armhf, o arm64 y descargamos el paquete de instalación.

En función de la distribución de Linux el gestor de paquetes cambiara,
tomamos como referencia una distribución con dpkg, para otro gestor
simplemente seria cambiar el comando de instalación del gestor de
dependencias por el que corresponda.

Particularizado a nuestro caso, instalamos Docker engine cambiando la
ruta de abajo por la ruta donde se descargó el paquete.

``` bash
sudo dpkg -i /ruta/paquete.deb
```

Una vez instalado, el paquete el daemon de Docker se debería haber
levantado automáticamente.

Para permitir utilizar Docker directamente en tu usuario sin ser a
través del usuario root, realizamos el siguiente paso descrito en la
documentación de Docker de
post-instalación[@wiki:postinstalacion-docker-linux]:

``` bash
#Crear el grupo docker.
sudo groupadd docker
#Añadir tu usuario al grupo docker.
sudo usermod -aG docker $USER
```

Para aplicar los cambios es necesario reiniciar el terminal.

Para verificar que Docker la instalación ha sido satisfactoria podemos
levantar el contenedor de hello-world.

``` bash
 sudo docker run hello-world
```

Este comando descarga una imagen de prueba y la ejecuta en un
contenedor. Cuando el contenedor se ejecuta, imprime un mensaje
informativo y acaba.

### NodeJs

La instalación de NodeJs es relativamente sencilla, simplemente hay que
descargar un paquete que contiene los binarios, descomprimirlo y
añadirlo la ruta /bin de la carpeta comprimida al de nuestro usuario
PATH.

Este procedimiento sirve tanto para Windows como para Linux, solo
difiere en el paquete descargado y en la forma que tenemos de añadir
esos binarios al PATH, en el caso de Windows es más sencillo aun hacerlo
mediante el instalador directamente.

Todos los paquetes para todas las versiones las plataformas que da
soporte NodeJS se encuentran en <https://nodejs.org/es/download/>.

Particularizando en el caso de una instalación en linux como indica la
documentación oficial[@wiki:instalacion-nodejs], seguimos los siguientes
pasos:

1.  Una vez descargado el paquete, descomprimimos el archivo binario en
    cualquier directorio donde se quiera instalar Node, en mi caso
    /usr/local/lib/nodejs

    ``` bash
    VERSION=v10.15.0
    DISTRO=linux-x64
    sudo mkdir -p /usr/local/lib/nodejs
    sudo tar -xJvf node-$VERSION-$DISTRO.tar.xz -C /usr/local/lib/nodejs 
    ```

2.  Establecemos la variable de entorno \~/.profile, añadiendo al final
    del fichero

    ``` bash
    # Nodejs
    VERSION=v10.15.0
    DISTRO=linux-x64
    export PATH=/usr/local/lib/nodejs/node-$VERSION-$DISTRO/bin:$PATH
    ```

3.  Actualizamos el profile de linux para recargar las variables de
    entorno del terminal:

    ``` bash
    . ~/.profile
    ```

4.  Probamos la instalación con

    ``` bash
    $ node -v
    ```
    
## Instalación del entorno de despliegue de infraestructura

Una vez tengamos resueltos todos los requisitos previos, procedemos a
descargar el entregable del TFM que contiene el código de
'Infraestructure As Code' encargado de desplegar el data
lake[@wiki:repo-tfm].

Podemos realizarlo de las siguientes dos formas:

1.  Sin necesidad de Git:

    ``` bash
    # Descargamos el repositorio en zip, lo descomprimimos
    # y entramos dentro de la carpeta
    wget https://github.com/saguila/tfm-cdk/archive/refs/heads/master.zip
    unzip master.zip
    cd tfm-cdk-master
    ```

2.  Utilizando Git:

    ``` bash
    # Clonamos el repositorio y entramos dentro de la carpeta
    git clone https://github.com/saguila/tfm-cdk.git
    cd tfm-cdk
    ```

Con el código descargado y dentro de la carpeta procedemos a preparar el
entorno de despliegue del marco de trabajo ejecutando los siguientes
comandos:

``` bash
# Instalamos el gestor de dependencias de JS yarn
sudo npm install --global yarn
# Instalamos todas las dependencias de JS
yarn build
```

Una vez finalizada la ejecución de estos comandos, el entorno ya está
preparado para desplegar toda la infraestructura mediante CDK.

## Despliegue de la infraestructura

Una vez que hemos realizado el paso previo, con la instalación de las
librerías de Javascript necesarias, realizamos el despliegue de la
infraestructura ejecutando el siguiente script ubicado en la raíz del
entregable[@wiki:repo-tfm]:

``` bash
deploy.sh
```

Este script recibe los siguientes parámetros:

1.  **kaggleUser**: Nombre de usuario de las credenciales de API de
    Kaggle generados.

2.  **kaggleKey**: Secret key de las credenciales de API de Kaggle
    generados.

3.  **dataSetName**: Nombre del conjunto de datos que incluye el data
    lake, es de carácter informativo para identificar los componentes
    dentro de AWS.

4.  **awsPrincipal**: ARN de la cuenta de AWS que sera la administradora
    del data lake.

5.  **landingDatabase**: Nombre de la base de datos de landing.

6.  **stagingDatabase**: Nombre de la base de datos de staging.

7.  **goldDatabase**: Nombre de la base de datos Gold.

8.  **s3Bucket**: Nombre del componente de almacenamiento de S3 que se
    genera para dar soporte al data lake.

9.  **kaggleDataset**: Nombre identificativo de la API al conjunto de
    datos de Kaggle que se pretende ingestar.

El ejemplo de ejecución del script para el conjunto de datos empleados
en la prueba de concepto sería:

``` bash
bash deploy.sh sebastian e4f65465846ef916b2d97bff69927913 cycle\
arn:aws:iam::194331265617:user/sebas landing staging gold\
tfm-data-lake pronto/cycle-share-dataset
```

Una vez finalizada la ejecución del script, si fue satisfactoria, se
habrán desplegado todas las plantillas de infraestructura de la
solución.
    