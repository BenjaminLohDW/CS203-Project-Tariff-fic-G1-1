# ---------- build stage ----------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache deps first (these layers rarely change)
COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 \
    mvn -q -DskipTests dependency:go-offline

# Now copy sources and build
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -q -DskipTests package

# ---------- runtime stage ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# (Optional) Run as non-root
# RUN addgroup -S app && adduser -S app -G app
# USER app

# Copy shaded/fat jar
COPY --from=build /app/target/*.jar /app/app.jar

# Copy Firebase credentials if available (file will be mounted via docker-compose volume)
# App works without this - public endpoints function, admin endpoints need Firebase

EXPOSE 5004
ENV SPRING_PROFILES_ACTIVE=docker \
    JAVA_OPTS=""

# Use exec form and pass JAVA_OPTS cleanly
ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar /app/app.jar"]
