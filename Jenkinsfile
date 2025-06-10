pipeline {
    agent any
    // environment {
    //     unirfinal = "${WORKSPACE}"
    //     INPUT_DIR = "${WORKSPACE}/archivos"
    //     INVENTORY_CSV = "${WORKSPACE}/file_inventory.csv"
    //     LOG_FILE = "${WORKSPACE}/pipeline.log"
    //     SLACK_ENABLED = "true"
    // }
    stages {
         stages {
             stage('Install Node.js') {
                 steps {
                     sh '''
                            echo "Installing Node.js..."

                            # Install Node.js 18.x using NodeSource and sudo
                            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                            sudo apt-get update -y
                            sudo apt-get install -y nodejs

                            echo "Node.js version:"
                            node -v
                            echo "NPM version:"
                            npm -v
                    '''
            }
        }     
        stage('Setup') {
            steps {
                script {
                    sh "echo 'Starting pipeline' >> ${LOG_FILE}"
                    sh "command -v node || { echo 'Node.js not found' >> ${LOG_FILE}; exit 1; }"
                    sh "command -v ansible || { echo 'Ansible not found' >> ${LOG_FILE}; exit 1; }"                    
                    sh "test -d ${INPUT_DIR} || { echo 'Input directory ${INPUT_DIR} not found' >> ${LOG_FILE}; exit 1; }"
                    sh "test -f scripts/db.js || { echo 'db.js script not found' >> ${LOG_FILE}; exit 1; }"
                    sh "npm install >> ${LOG_FILE} 2>&1"
                    sh "echo 'Setup completed' >> ${LOG_FILE}"
                }
            }
        }

        stage('Inventory and Classify') {
            steps {
                script {
                    try {
                        sh "node scripts/scanyclasifica.js ${INPUT_DIR} ${INVENTORY_CSV} >> ${LOG_FILE} 2>&1"
                        sh "echo 'Inventory and classification completed' >> ${LOG_FILE}"
                    } catch (Exception e) {
                        sh "echo 'Error in Inventory and Classify: ${e}' >> ${LOG_FILE}"
                        error "Inventory and Classify failed: ${e}"
                    }
                }
            }
        }
        stage('Deduplicate') {
            steps {
                script {
                    try {
                        sh "node scripts/deduplicate.js ${INVENTORY_CSV} >> ${LOG_FILE} 2>&1"
                        sh "echo 'Deduplication report generated' >> ${LOG_FILE}"
                        // if (env.SLACK_ENABLED == "true") {
                        //     slackSend(message: "Duplicates detected. Review duplicates_report.csv in ${WORKSPACE}")
                        // }
                    } catch (Exception e) {
                        sh "echo 'Error in Deduplicate: ${e}' >> ${LOG_FILE}"
                        error "Deduplicate failed: ${e}"
                    }
                }
            }
        }
        // stage('Review Duplicates') {
        //     steps {
        //         script {
        //             try {
        //                 input message: 'Approve duplicate deletion?', ok: 'Yes'
        //                 sh "node scripts/deduplicate_files.js ${INVENTORY_CSV} --delete >> ${LOG_FILE} 2>&1"
        //                 sh "echo 'Duplicates deleted' >> ${LOG_FILE}"
        //             } catch (Exception e) {
        //                 sh "echo 'Error in Review Duplicates: ${e}' >> ${LOG_FILE}"
        //                 error "Review Duplicates failed: ${e}"
        //             }
        //         }
        //     }
        // }
        // stage('Organize Files') {
        //     steps {
        //         script {
        //             try {
        //                 sh "ansible-playbook -i inventory playbooks/organize_files.yml >> ${LOG_FILE} 2>&1"
        //                 sh "echo 'Files organized' >> ${LOG_FILE}"
        //             } catch (Exception e) {
        //                 sh "echo 'Error in Organize Files: ${e}' >> ${LOG_FILE}"
        //                 error "Organize Files failed: ${e}"
        //             }
        //         }
        //     }
        // }
        // stage('Migrate to Google Drive') {
        //     steps {
        //         script {
        //             try {
        //                 sh "ansible-playbook -i inventory playbooks/migrate_to_drive.yml >> ${LOG_FILE} 2>&1"
        //                 sh "echo 'Migration to Google Drive completed' >> ${LOG_FILE}"
        //             } catch (Exception e) {
        //                 sh "echo 'Error in Migrate to Google Drive: ${e}' >> ${LOG_FILE}"
        //                 error "Migrate to Google Drive failed: ${e}"
        //             }
        //         }
        //     }
        // }
        // stage('Verify Migration') {
        //     steps {
        //         script {
        //             try {
        //                 sh "node scripts/verify_migration.js ${INVENTORY_CSV} >> ${LOG_FILE} 2>&1"
        //                 sh "echo 'Migration verification completed' >> ${LOG_FILE}"
        //                 if (env.SLACK_ENABLED == "true") {
        //                     slackSend(message: "Migration to Google Drive completed. Verification report in ${WORKSPACE_DIR}/migration_verification_report.txt")
        //                 }
        //             } catch (Exception e) {
        //                 sh "echo 'Error in Verify Migration: ${e}' >> ${LOG_FILE}"
        //                 error "Verify Migration failed: ${e}"
        //             }
        //         }
        //     }
        // }
    }
    // post {
    //     always {
    //         archiveArtifacts artifacts: 'pipeline.log, file_inventory.csv, duplicates_report.csv, migration_verification_report.txt', allowEmptyArchive: true
    //     }
    //     failure {
    //         script {
    //             if (env.SLACK_ENABLED == "true") {
    //                 slackSend(color: 'danger', message: "Pipeline failed. Check ${WORKSPACE_DIR}/pipeline.log for details.")
    //             }
    //         }
    //     }
    // }
}