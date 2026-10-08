pipeline {
    agent any

    options {
        disableConcurrentBuilds()

        buildDiscarder(
            logRotator(numToKeepStr: '20')
        )

        timeout(
            time: 30,
            unit: 'MINUTES'
        )

        skipDefaultCheckout(true)
    }

    environment {
        PROJECT_NAME = "${env.JOB_BASE_NAME}"
        IMAGE_NAME = "${env.REGISTRY_URL}/${env.JOB_BASE_NAME}:${env.BUILD_NUMBER}"
        DOCKER_NETWORK = "openiov-management"
        DOCKERFILE_PATH = "Dockerfile"
    }

    stages {
        stage('拉取代码') {
            steps {
                echo '================ 拉取代码 ================'

                checkout scm

                sh '''
                    set -eu

                    echo "任务名称：${JOB_NAME}"
                    echo "项目名称：${PROJECT_NAME}"
                    echo "构建编号：${BUILD_NUMBER}"
                    echo "Git分支：${GIT_BRANCH:-unknown}"
                    echo "Git提交：$(git rev-parse HEAD)"
                    echo "目标镜像：${IMAGE_NAME}"
                '''
            }
        }

        stage('环境检查') {
            steps {
                echo '================ 环境检查 ================'

                sh '''
                    set -eu

                    if [ -z "${REGISTRY_URL:-}" ]; then
                        echo "错误：Jenkins 未配置 REGISTRY_URL"
                        exit 1
                    fi

                    if [ ! -f "package.json" ]; then
                        echo "错误：项目根目录不存在 package.json"
                        exit 1
                    fi

                    if [ ! -f "package-lock.json" ]; then
                        echo "错误：项目根目录不存在 package-lock.json"
                        echo "请提交 package-lock.json，以便 Dockerfile 使用 npm ci"
                        exit 1
                    fi

                    if [ ! -f "${DOCKERFILE_PATH}" ]; then
                        echo "错误：项目根目录不存在 ${DOCKERFILE_PATH}"
                        exit 1
                    fi

                    if [ ! -f "ui-nginx.conf" ]; then
                        echo "错误：项目根目录不存在 ui-nginx.conf"
                        exit 1
                    fi

                    echo "检查 Docker..."
                    docker version

                    echo "检查 Docker 网络：${DOCKER_NETWORK}"
                    docker network inspect "${DOCKER_NETWORK}" >/dev/null

                    echo "环境检查通过"
                '''
            }
        }

        stage('构建前端镜像') {
            steps {
                echo '================ 构建前端镜像 ================'

                sh '''
                    set -eu

                    GIT_COMMIT_ID="$(git rev-parse HEAD)"

                    docker build \
                        --network "${DOCKER_NETWORK}" \
                        --label "jenkins.job=${JOB_NAME}" \
                        --label "jenkins.build=${BUILD_NUMBER}" \
                        --label "git.commit=${GIT_COMMIT_ID}" \
                        --build-arg NODE_OPTIONS="--max-old-space-size=4096" \
                        --tag "${IMAGE_NAME}" \
                        --file "${DOCKERFILE_PATH}" \
                        .

                    echo "检查构建结果..."
                    docker image inspect "${IMAGE_NAME}" >/dev/null

                    echo "镜像构建成功：${IMAGE_NAME}"
                '''
            }
        }

        stage('上传镜像') {
            steps {
                echo '================ 上传镜像 ================'

                withCredentials([
                    usernamePassword(
                        credentialsId: 'tencent-tcr',
                        usernameVariable: 'REGISTRY_USERNAME',
                        passwordVariable: 'REGISTRY_PASSWORD'
                    )
                ]) {
                    sh '''
                        set -eu

                        REGISTRY_HOST="${REGISTRY_URL%%/*}"

                        export DOCKER_CONFIG="${WORKSPACE}/.docker-push-auth"

                        rm -rf "${DOCKER_CONFIG}"
                        mkdir -p "${DOCKER_CONFIG}"

                        cleanup_registry_auth() {
                            docker logout "${REGISTRY_HOST}" \
                                >/dev/null 2>&1 || true

                            rm -rf "${DOCKER_CONFIG}"
                        }

                        trap cleanup_registry_auth EXIT HUP INT TERM

                        echo "登录镜像仓库：${REGISTRY_HOST}"

                        echo "${REGISTRY_PASSWORD}" |
                            docker login "${REGISTRY_HOST}" \
                                --username "${REGISTRY_USERNAME}" \
                                --password-stdin

                        echo "上传镜像：${IMAGE_NAME}"

                        docker push "${IMAGE_NAME}"

                        echo "镜像上传成功：${IMAGE_NAME}"
                    '''
                }
            }
        }

        stage('部署镜像') {
            steps {
                echo '================ 部署镜像 ================'

                withCredentials([
                    usernamePassword(
                        credentialsId: 'tencent-tcr',
                        usernameVariable: 'REGISTRY_USERNAME',
                        passwordVariable: 'REGISTRY_PASSWORD'
                    )
                ]) {
                    sh '''
                        set -eu

                        REGISTRY_HOST="${REGISTRY_URL%%/*}"

                        export DOCKER_CONFIG="${WORKSPACE}/.docker-pull-auth"

                        rm -rf "${DOCKER_CONFIG}"
                        mkdir -p "${DOCKER_CONFIG}"

                        cleanup_registry_auth() {
                            docker logout "${REGISTRY_HOST}" \
                                >/dev/null 2>&1 || true

                            rm -rf "${DOCKER_CONFIG}"
                        }

                        trap cleanup_registry_auth EXIT HUP INT TERM

                        echo "登录镜像仓库：${REGISTRY_HOST}"

                        echo "${REGISTRY_PASSWORD}" |
                            docker login "${REGISTRY_HOST}" \
                                --username "${REGISTRY_USERNAME}" \
                                --password-stdin

                        OLD_IMAGE=""

                        if docker container inspect "${PROJECT_NAME}" \
                            >/dev/null 2>&1; then

                            OLD_IMAGE=$(
                                docker container inspect \
                                    --format '{{.Config.Image}}' \
                                    "${PROJECT_NAME}"
                            )

                            echo "当前运行镜像：${OLD_IMAGE}"
                        else
                            echo "当前不存在旧容器，本次为首次部署"
                        fi

                        echo "从 TCR 拉取目标镜像：${IMAGE_NAME}"

                        docker pull "${IMAGE_NAME}"

                        echo "停止并删除旧容器..."

                        docker stop "${PROJECT_NAME}" \
                            >/dev/null 2>&1 || true

                        docker rm "${PROJECT_NAME}" \
                            >/dev/null 2>&1 || true

                        echo "启动新容器..."

                        # 不发布宿主端口：上游 nginx 容器在同一 ${DOCKER_NETWORK}
                        # 网络内通过容器名直连 http://${PROJECT_NAME}:80，
                        # 既避免与同主机其他服务抢端口，也不额外增加对外暴露面。
                        docker run -d \
                            --name "${PROJECT_NAME}" \
                            --network "${DOCKER_NETWORK}" \
                            --restart unless-stopped \
                            --memory 512m \
                            --memory-reservation 128m \
                            --label "jenkins.job=${JOB_NAME}" \
                            --label "jenkins.build=${BUILD_NUMBER}" \
                            --label "git.commit=$(git rev-parse HEAD)" \
                            "${IMAGE_NAME}"

                        echo "等待容器健康检查..."

                        COUNT=0
                        HEALTHY=false

                        while [ "${COUNT}" -lt 12 ]; do
                            RUNNING=$(
                                docker container inspect \
                                    --format '{{.State.Running}}' \
                                    "${PROJECT_NAME}" \
                                    2>/dev/null || echo "false"
                            )

                            if [ "${RUNNING}" != "true" ]; then
                                echo "容器已经退出"
                                break
                            fi

                            HEALTH_STATUS=$(
                                docker container inspect \
                                    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
                                    "${PROJECT_NAME}"
                            )

                            echo "健康状态：${HEALTH_STATUS}"

                            if [ "${HEALTH_STATUS}" = "healthy" ]; then
                                HEALTHY=true
                                break
                            fi

                            if [ "${HEALTH_STATUS}" = "unhealthy" ]; then
                                echo "容器状态已经变为 unhealthy"
                                break
                            fi

                            COUNT=$((COUNT + 1))

                            echo "等待健康检查：${COUNT}/12"

                            sleep 5
                        done

                        if [ "${HEALTHY}" = "true" ]; then
                            echo "服务健康检查通过"
                            echo "部署成功：${IMAGE_NAME}"

                            exit 0
                        fi

                        echo "服务健康检查失败"

                        echo "================ 容器日志 ================"

                        docker logs \
                            --tail 200 \
                            "${PROJECT_NAME}" || true

                        echo "================ 健康检查日志 ================"

                        docker container inspect \
                            --format '{{json .State.Health}}' \
                            "${PROJECT_NAME}" || true

                        echo "停止并删除异常容器..."

                        docker stop "${PROJECT_NAME}" \
                            >/dev/null 2>&1 || true

                        docker rm "${PROJECT_NAME}" \
                            >/dev/null 2>&1 || true

                        if [ -n "${OLD_IMAGE}" ]; then
                            echo "准备回滚到旧镜像：${OLD_IMAGE}"

                            if ! docker image inspect "${OLD_IMAGE}" \
                                >/dev/null 2>&1; then

                                echo "本地不存在旧镜像，尝试重新拉取：${OLD_IMAGE}"

                                docker pull "${OLD_IMAGE}"
                            fi

                            docker run -d \
                                --name "${PROJECT_NAME}" \
                                --network "${DOCKER_NETWORK}" \
                                --restart unless-stopped \
                                --memory 512m \
                                --memory-reservation 128m \
                                --label "jenkins.rollback=true" \
                                --label "jenkins.rollback.from=${IMAGE_NAME}" \
                                "${OLD_IMAGE}"

                            echo "已回滚到旧镜像：${OLD_IMAGE}"
                        else
                            echo "首次部署失败，没有旧镜像可以回滚"
                        fi

                        exit 1
                    '''
                }
            }
        }
        stage('清理旧镜像') {
            steps {
                echo '================ 清理旧镜像 ================'

                sh '''
                    set -eu

                    IMAGE_REPO="${REGISTRY_URL}/${PROJECT_NAME}"

                    KEEP=3

                    echo "镜像仓库：${IMAGE_REPO}（保留最近 ${KEEP} 个构建）"

                    # tag 即 BUILD_NUMBER，按数值倒序后跳过要保留的，其余删除。
                    # 当前运行中的镜像在保留范围内；若被 docker 判定仍被容器引用，
                    # docker image rm 会失败，此处容错忽略。
                    docker images "${IMAGE_REPO}" --format '{{.Tag}}' |
                        grep -E '^[0-9]+$' |
                        sort -rn |
                        tail -n "+$((KEEP + 1))" |
                        while read -r OLD_TAG; do
                            echo "删除旧镜像：${IMAGE_REPO}:${OLD_TAG}"

                            docker image rm "${IMAGE_REPO}:${OLD_TAG}" \
                                >/dev/null 2>&1 || true
                        done

                    echo "清理悬空镜像层..."

                    docker image prune -f >/dev/null 2>&1 || true

                    echo "旧镜像清理完成"
                '''
            }
        }
    }

    post {
        success {
            echo "部署成功：${env.IMAGE_NAME}"
        }

        failure {
            echo '部署失败，请检查 Jenkins 构建日志和容器日志。'
        }

        always {
            echo '================ 清理认证目录 ================'

            sh '''
                rm -rf \
                    "${WORKSPACE}/.docker-push-auth" \
                    "${WORKSPACE}/.docker-pull-auth"
            '''

            echo '================ 清理 Workspace ================'

            deleteDir()
        }
    }
}
