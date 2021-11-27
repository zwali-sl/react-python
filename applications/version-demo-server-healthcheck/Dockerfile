FROM python:3.7

# Dir setup
ENV WORK_DIR /version-demo-server-healthcheck
RUN mkdir ${WORK_DIR}
# Do we need volume to write tmp file?
VOLUME ${WORK_DIR}  
WORKDIR ${WORK_DIR}

COPY ./version-demo-server-healthcheck/requirements.txt .

#RUN apk add --no-cache gcc musl-dev
RUN python -m pip install -r requirements.txt --trusted-host files.pythonhosted.org --trusted-host pypi.org --trusted-host pypi.python.org

# files into filesystem
COPY ./version-demo-server-healthcheck/server.py .

# exectute start up script
ENV PYTHONUNBUFFERED=1
ENTRYPOINT ["python", "server.py"]