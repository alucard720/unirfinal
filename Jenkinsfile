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

                    // Validate Node.js and Ansible installation
                    sh "node -v || { echo 'Node.js not found' >> ${LOG_FILE}; exit 1; }"
                    sh "npm -v || { echo 'npm not found' >> ${LOG_FILE}; exit 1; }"
                    // sh "ansible --version || { echo 'Ansible not found' >> ${LOG_FILE}; exit 1; }"

                  
                    // // Install Node.js dependencies
                    // sh "npm install >> ${LOG_FILE} 2>&1"

                    // Explicitly use full node path to be 100% sure
                    sh "${ANSIBLE_PATH}  -i inventory playbooks/archivosorganizados.yml"

                    sh "echo 'Setup completed' >> ${LOG_FILE}"
                }
            }
        }
    }
    

}
    