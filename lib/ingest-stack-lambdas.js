"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestStackLambdas = void 0;
const cdk = require("@aws-cdk/core");
const aws_lambda_1 = require("@aws-cdk/aws-lambda");
const core_1 = require("@aws-cdk/core");
const path = require("path");
class IngestStackLambdas extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // -c environment=prod
        // https://docs.aws.amazon.com/cdk/latest/guide/parameters.html
        // cdk deploy MyStack YourStack --parameters MyStack:uploadBucketName=UploadBucket --parameters YourStack:uploadBucketName=UpBucket
        const kaggleUser = new core_1.CfnParameter(this, "kaggleUser", {
            type: "String",
            default: "",
            description: "The username of Kaggle."
        });
        const kaggleKey = new core_1.CfnParameter(this, "kaggleKey", {
            type: "String",
            default: "",
            description: "The API key of Kaggle."
        });
        const kaggleDataset = new core_1.CfnParameter(this, "kaggleDataset", {
            type: "String",
            default: "",
            description: "Kaggle competition name."
        });
        const kagglePythonLayer = new aws_lambda_1.LayerVersion(this, 'kaggle-layer', {
            code: new aws_lambda_1.AssetCode(path.join('lib', 'ingestion', 'lambda-layers', 'kaggle', 'kaggle-layer.zip')),
            compatibleRuntimes: [aws_lambda_1.Runtime.PYTHON_3_8]
        });
        const lambdaIngest = new aws_lambda_1.Function(this, 'seed', {
            code: new aws_lambda_1.AssetCode(path.join('lib', 'ingestion', 'lambdas', 'kaggle-ingest')),
            handler: 'kaggle_ingest.handler_request',
            runtime: aws_lambda_1.Runtime.PYTHON_3_8,
            layers: [kagglePythonLayer],
            environment: {
                KAGGLE_USERNAME: kaggleUser.valueAsString,
                KAGGLE_KEY: kaggleKey.valueAsString,
                KAGGLE_DATASET: kaggleDataset.valueAsString // props?.kaggleDataset || ""
            },
            timeout: cdk.Duration.seconds(200)
        });
    }
}
exports.IngestStackLambdas = IngestStackLambdas;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5nZXN0LXN0YWNrLWxhbWJkYXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmdlc3Qtc3RhY2stbGFtYmRhcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFFckMsb0RBQWdGO0FBQ2hGLHdDQUE2QztBQUM3Qyw2QkFBNkI7QUFTN0IsTUFBYSxrQkFBbUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM3QyxZQUFZLEtBQW9CLEVBQUUsRUFBVSxFQUFFLEtBQWdEO1FBRTFGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHNCQUFzQjtRQUN0QiwrREFBK0Q7UUFDL0QsbUlBQW1JO1FBRW5JLE1BQU0sVUFBVSxHQUFHLElBQUksbUJBQVksQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3BELElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFDLEVBQUU7WUFDVixXQUFXLEVBQUUseUJBQXlCO1NBQUMsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sU0FBUyxHQUFHLElBQUksbUJBQVksQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ2xELElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFDLEVBQUU7WUFDVixXQUFXLEVBQUUsd0JBQXdCO1NBQUMsQ0FBQyxDQUFDO1FBRTVDLE1BQU0sYUFBYSxHQUFHLElBQUksbUJBQVksQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzFELElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFDLEVBQUU7WUFDVixXQUFXLEVBQUUsMEJBQTBCO1NBQUMsQ0FBQyxDQUFDO1FBRzlDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSx5QkFBWSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDN0QsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ2hHLGtCQUFrQixFQUFFLENBQUMsb0JBQU8sQ0FBQyxVQUFVLENBQUM7U0FDM0MsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLEdBQUcsSUFBSSxxQkFBUSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUU7WUFDNUMsSUFBSSxFQUFFLElBQUksc0JBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBQzlFLE9BQU8sRUFBRSwrQkFBK0I7WUFDeEMsT0FBTyxFQUFFLG9CQUFPLENBQUMsVUFBVTtZQUMzQixNQUFNLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztZQUMzQixXQUFXLEVBQUU7Z0JBQ1QsZUFBZSxFQUFFLFVBQVUsQ0FBQyxhQUFhO2dCQUN6QyxVQUFVLEVBQUUsU0FBUyxDQUFDLGFBQWE7Z0JBQ25DLGNBQWMsRUFBRSxhQUFhLENBQUMsYUFBYSxDQUFDLDZCQUE2QjthQUM1RTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7U0FDckMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKO0FBM0NELGdEQTJDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xuXG5pbXBvcnQgeyBMYXllclZlcnNpb24sIEFzc2V0Q29kZSwgUnVudGltZSwgRnVuY3Rpb24gfSBmcm9tIFwiQGF3cy1jZGsvYXdzLWxhbWJkYVwiXG5pbXBvcnQgeyBDZm5QYXJhbWV0ZXIgfSBmcm9tIFwiQGF3cy1jZGsvY29yZVwiO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29udGV4dEluZ2VzdGlvblByb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICAgIHJlYWRvbmx5IGthZ2dsZVVzZXI/OiBzdHJpbmc7XG4gICAgcmVhZG9ubHkga2FnZ2xlS2V5Pzogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGthZ2dsZUNvbXBldGl0aW9uPzogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgSW5nZXN0U3RhY2tMYW1iZGFzIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkNvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiAvKmNkay5TdGFja1Byb3BzKi8gQ29udGV4dEluZ2VzdGlvblByb3BzKSB7XG5cbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAgICAgLy8gLWMgZW52aXJvbm1lbnQ9cHJvZFxuICAgICAgICAvLyBodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vY2RrL2xhdGVzdC9ndWlkZS9wYXJhbWV0ZXJzLmh0bWxcbiAgICAgICAgLy8gY2RrIGRlcGxveSBNeVN0YWNrIFlvdXJTdGFjayAtLXBhcmFtZXRlcnMgTXlTdGFjazp1cGxvYWRCdWNrZXROYW1lPVVwbG9hZEJ1Y2tldCAtLXBhcmFtZXRlcnMgWW91clN0YWNrOnVwbG9hZEJ1Y2tldE5hbWU9VXBCdWNrZXRcblxuICAgICAgICBjb25zdCBrYWdnbGVVc2VyID0gbmV3IENmblBhcmFtZXRlcih0aGlzLCBcImthZ2dsZVVzZXJcIiwge1xuICAgICAgICAgICAgdHlwZTogXCJTdHJpbmdcIixcbiAgICAgICAgICAgIGRlZmF1bHQ6XCJcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRoZSB1c2VybmFtZSBvZiBLYWdnbGUuXCJ9KTtcblxuICAgICAgICBjb25zdCBrYWdnbGVLZXkgPSBuZXcgQ2ZuUGFyYW1ldGVyKHRoaXMsIFwia2FnZ2xlS2V5XCIsIHtcbiAgICAgICAgICAgIHR5cGU6IFwiU3RyaW5nXCIsXG4gICAgICAgICAgICBkZWZhdWx0OlwiXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJUaGUgQVBJIGtleSBvZiBLYWdnbGUuXCJ9KTtcblxuICAgICAgICBjb25zdCBrYWdnbGVEYXRhc2V0ID0gbmV3IENmblBhcmFtZXRlcih0aGlzLCBcImthZ2dsZURhdGFzZXRcIiwge1xuICAgICAgICAgICAgdHlwZTogXCJTdHJpbmdcIixcbiAgICAgICAgICAgIGRlZmF1bHQ6XCJcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkthZ2dsZSBjb21wZXRpdGlvbiBuYW1lLlwifSk7XG5cblxuICAgICAgICBjb25zdCBrYWdnbGVQeXRob25MYXllciA9IG5ldyBMYXllclZlcnNpb24odGhpcywgJ2thZ2dsZS1sYXllcicsIHtcbiAgICAgICAgICAgIGNvZGU6IG5ldyBBc3NldENvZGUocGF0aC5qb2luKCdsaWInLCAnaW5nZXN0aW9uJywgJ2xhbWJkYS1sYXllcnMnLCAna2FnZ2xlJywna2FnZ2xlLWxheWVyLnppcCcpKSxcbiAgICAgICAgICAgIGNvbXBhdGlibGVSdW50aW1lczogW1J1bnRpbWUuUFlUSE9OXzNfOF1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgbGFtYmRhSW5nZXN0ID0gbmV3IEZ1bmN0aW9uKHRoaXMsICdzZWVkJywge1xuICAgICAgICAgICAgY29kZTogbmV3IEFzc2V0Q29kZShwYXRoLmpvaW4oJ2xpYicsICdpbmdlc3Rpb24nLCAnbGFtYmRhcycsICdrYWdnbGUtaW5nZXN0JykpLFxuICAgICAgICAgICAgaGFuZGxlcjogJ2thZ2dsZV9pbmdlc3QuaGFuZGxlcl9yZXF1ZXN0JyxcbiAgICAgICAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuUFlUSE9OXzNfOCxcbiAgICAgICAgICAgIGxheWVyczogW2thZ2dsZVB5dGhvbkxheWVyXSxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgICAgICAgS0FHR0xFX1VTRVJOQU1FOiBrYWdnbGVVc2VyLnZhbHVlQXNTdHJpbmcsIC8vcHJvcHM/LmthZ2dsZVVzZXIgfHwgXCJcIiAsXG4gICAgICAgICAgICAgICAgS0FHR0xFX0tFWToga2FnZ2xlS2V5LnZhbHVlQXNTdHJpbmcsIC8vcHJvcHM/LmthZ2dsZUtleSB8fCBcIlwiICxcbiAgICAgICAgICAgICAgICBLQUdHTEVfREFUQVNFVDoga2FnZ2xlRGF0YXNldC52YWx1ZUFzU3RyaW5nIC8vIHByb3BzPy5rYWdnbGVEYXRhc2V0IHx8IFwiXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMDApXG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=