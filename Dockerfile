FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    libaio1t64 \
    unzip \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/lib/x86_64-linux-gnu/libaio.so.1t64 /usr/lib/x86_64-linux-gnu/libaio.so.1

RUN mkdir -p /opt/oracle

# Copiar los zips desde tu carpeta local al contenedor
COPY instantclient-basic-linux.x64-23.26.3.0.0.zip /opt/oracle/
COPY instantclient-sdk-linux.x64-23.26.3.0.0.zip /opt/oracle/

RUN cd /opt/oracle && \
    unzip -oq instantclient-basic-linux.x64-23.26.3.0.0.zip && \
    unzip -oq instantclient-sdk-linux.x64-23.26.3.0.0.zip && \
    mv instantclient_* instantclient && \
    rm *.zip

ENV LD_LIBRARY_PATH="/opt/oracle/instantclient"

RUN echo /opt/oracle/instantclient > /etc/ld.so.conf.d/oracle.conf && ldconfig

RUN echo "instantclient,/opt/oracle/instantclient" | pecl install oci8-3.2.1 \
    && docker-php-ext-enable oci8