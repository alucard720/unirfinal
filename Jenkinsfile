pipeline {
    agent any

    environment {
        PATH = "/usr/local/bin:$PATH"
        PATH_ANSIBLE = "/Library/Frameworks/Python.framework/Versions/3.13/bin:$PATH"
        unirfinal = "${WORKSPACE}"
        INPUT_DIR = "${WORKSPACE}/archivos"
        INVENTORY_CSV = "${WORKSPACE}/file_inventory.csv"
        LOG_FILE = "${WORKSPACE}/pipeline.log"
        SLACK_ENABLED = "true"
        ANSIBLE_PATH = "/Library/Frameworks/Python.framework/Versions/3.13/bin/ansible-playbook"
    }

    stages {
        stage('Setup') {
            steps {
                script {
                    sh "echo 'Starting pipeline' >> ${LOG_FILE}"

                    sh "node -v || { echo 'Node.js not found' >> ${LOG_FILE}; exit 1; }"
                    sh "npm -v || { echo 'npm not found' >> ${LOG_FILE}; exit 1; }"

                    // Database init
                    retry(2) {
                        sh "node scripts/db.js >> ${LOG_FILE} 2>&1"
                    }

                    // Backup NAS
                    retry(2) {
                        sh "${ANSIBLE_PATH} -i inventory playbooks/backup_nas.yml >> ${LOG_FILE} 2>&1"
                    }

                    // Organize files
                    retry(2) {
                        sh "${ANSIBLE_PATH} -i inventory playbooks/archivosorganizados.yml >> ${LOG_FILE} 2>&1"
                    }

                    // Google Drive migration
                    retry(2) {
                        sh "node scripts/migraciondrive.js >> ${LOG_FILE} 2>&1"
                    }

                    sh "echo 'Pipeline completed successfully' >> ${LOG_FILE}"
                }
            }
        }
    }

    post {
        success {
            script {
                if (env.SLACK_ENABLED == "true") {
                    slackSend(channel: '#notifications', message: "✅ Pipeline completed successfully: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
                }
            }
        }
        failure {
            script {
                if (env.SLACK_ENABLED == "true") {
                    slackSend(channel: '#notifications', message: "❌ Pipeline failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
                }
            }
        }
    }
}
