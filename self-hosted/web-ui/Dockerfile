FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a placeholder directory for the web UI content
RUN mkdir -p /usr/share/nginx/html

# The actual content will be mounted as a volume when running Docker Compose
# Frontend files should be copied from source/frontend/build after building the UI

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]