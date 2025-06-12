pipeline {
    agent any
    environment {
        unirfinal = "${WORKSPACE}"
        INPUT_DIR = "${WORKSPACE}/archivos"
        INVENTORY_CSV = "${WORKSPACE}/file_inventory.csv"
        LOG_FILE = "${WORKSPACE}/pipeline.log"
        SLACK_ENABLED = "true"
    }
    stages {
        stage('Setup') {
            steps {
                script {
                    sh "echo 'Starting pipeline' >> ${LOG_FILE}"
                    echo "Installing Node.js on macOS..."

                    // Install Node.js using Homebrew (macOS)
                    sh '''
                        if ! command -v brew >/dev/null 2>&1; then
                            echo "Homebrew not found. Installing..."
                            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                        fi

                        brew update
                        brew install node ansible
                    '''

                    echo "Node.js version:"
                    sh "node -v"
                    echo "NPM version:"
                    sh "npm -v"
                    echo "Ansible version:"
                    sh "ansible --version"

                    // Check required tools and files
                    sh "command -v node || { echo 'Node.js not found' >> ${LOG_FILE}; exit 1; }"
                    sh "command -v ansible || { echo 'Ansible not found' >> ${LOG_FILE}; exit 1; }"
                    sh "test -d ${INPUT_DIR} || { echo 'Input directory ${INPUT_DIR} not found' >> ${LOG_FILE}; exit 1; }"
                    sh "test -f scripts/init_db.js || { echo 'init_db.js script not found' >> ${LOG_FILE}; exit 1; }"
                    sh "test -f archivosorganizados.yml || { echo 'Ansible playbook not found' >> ${LOG_FILE}; exit 1; }"

                    // Install project dependencies
                    sh "npm install >> ${LOG_FILE} 2>&1"
                    sh "echo 'Setup completed' >> ${LOG_FILE}"
                }
            }
        }

        stage('Run Ansible Playbook') {
            steps {
                script {
                    try {
                        echo "Running Ansible playbook..."
                        sh "ansible-playbook archivosorganizados.yml >> ${LOG_FILE} 2>&1"
                        sh "echo 'Ansible playbook execution completed' >> ${LOG_FILE}"
                    } catch (Exception e) {
                        sh "echo 'Error in Ansible Playbook: ${e}' >> ${LOG_FILE}"
                        error "Ansible Playbook failed: ${e}"
                    }
                }
            }
        }
    }
}
