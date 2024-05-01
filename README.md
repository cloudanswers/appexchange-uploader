# appexchange-uploader

helper script to push gen1 packages to the appexchange

# usage

    SALESFORCE_USERNAME=package-user@example.com \
    SALESFORCE_PASSWORD=XXXXXXXX \
    GIT_SHA=`git rev-parse --short HEAD` \
    npx @cloudanswers/appexchange-uploader
