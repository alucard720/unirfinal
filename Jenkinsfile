pipeline {
    agent any

    environment {
        unirfinal = "${WORKSPACE}"
        INPUT_DIR = "${WORKSPACE}/archivos"
        INVENTORY_CSV = "${WORKSPACE}/file_inventory.csv"
        LOG_FILE = "${WORKSPACE}/pipeline.log"
        SLACK_ENABLED = "true"
        // Inject Node and NPM path globally
        PATH_NODE = "/usr/local/bin"
        PATH_ANSIBLE = "/Library/Frameworks/Python.framework/Versions/3.13/bin"
    }

    stages {
        stage('Setup') {
            steps {
                script {
                    sh "echo 'Starting pipeline' >> ${LOG_FILE}"

                    // Validate Node.js and Ansible installation
                    sh "${PATH_NODE}/node -v || { echo 'Node.js not found' >> ${LOG_FILE}; exit 1; }"
                    // sh "${PATH_NODE}/npm -v || { echo 'npm not found' >> ${LOG_FILE}; exit 1; }"
                    sh "${PATH_ANSIBLE}/ansible --version || { echo 'Ansible not found' >> ${LOG_FILE}; exit 1; }"

                    // Validate required files
                    sh "test -d ${INPUT_DIR} || { echo 'Input directory ${INPUT_DIR} not found' >> ${LOG_FILE}; exit 1; }"
                    sh "test -f ${WORKSPACE}/scripts/db.js || { echo 'db.js script not found' >> ${LOG_FILE}; exit 1; }"

                    // Install Node.js dependencies
                    // sh "${PATH_NODE}/npm install >> ${LOG_FILE} 2>&1"

                    // Initialize the database
                    sh "${PATH_NODE}/node ${WORKSPACE}/scripts/db.js >> ${LOG_FILE} 2>&1"

                    sh "echo 'Setup completed' >> ${LOG_FILE}"
                }
            }
        }

        // Uncomment if needed
        // stage('Inventory and Classify') {
        //     steps {
        //         script {
        //             try {
        //                 sh "${PATH_NODE}/node ${WORKSPACE}/scripts/scanyclasifica.js ${INPUT_DIR} ${INVENTORY_CSV} >> ${LOG_FILE} 2>&1"
        //                 sh "echo 'Inventory and classification completed' >> ${LOG_FILE}"
        //             } catch (Exception e) {
        //                 sh "echo 'Error in Inventory and Classify: ${e}' >> ${LOG_FILE}"
        //                 error "Inventory and Classify failed: ${e}"
        //             }
        //         }
        //     }
        // }

        stage('Organize Files') {
            steps {
                script {
                    try {
                        sh "${PATH_ANSIBLE}/ansible-playbook -i ${WORKSPACE}/inventory ${WORKSPACE}/playbooks/archivosorganizados.yml >> ${LOG_FILE} 2>&1"
                        sh "echo 'File organization completed' >> ${LOG_FILE}"
                    } catch (Exception e) {
                        sh "echo 'Error in Organize Files: ${e}' >> ${LOG_FILE}"
                        error "Organize Files failed: ${e}"
                    }
                }
            }
        }

        // stage('Deduplicate') {
        //     steps {
        //         script {
        //             try {
        //                 sh "${PATH_NODE}/node ${WORKSPACE}/scripts/deduplicate.js ${INVENTORY_CSV} >> ${LOG_FILE} 2>&1"
        //                 sh "echo 'Deduplication report generated' >> ${LOG_FILE}"
        //             } catch (Exception e) {
        //                 sh "echo 'Error in Deduplicate: ${e}' >> ${LOG_FILE}"
        //                 error "Deduplicate failed: ${e}"
        //             }
        //         }
        //     }
        // }
    }

    post {
        always {
            echo 'Pipeline completed'
            sh "echo 'Pipeline finished: >> ${LOG_FILE}"
        }
    }
}
