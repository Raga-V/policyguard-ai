FROM permitio/cedar-agent:latest

# Copy base policies and schema at build time
# Individual agent policies are loaded dynamically via REST API
COPY policies/ /app/policies/
COPY schema.cedarschema /app/schema.json
COPY entities.json /app/entities.json

EXPOSE 8180
