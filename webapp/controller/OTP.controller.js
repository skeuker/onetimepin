sap.ui.define([
	"pnp/onetimepin/controller/Base.controller",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("pnp.onetimepin.controller.OTP", {

		//on initialization
		onInit: function() {

			//instantiate view model
			this.oViewModel = new JSONModel({});

			//set view model to view
			this.setModel(this.oViewModel, "AppViewModel");

			//set OTP context model to view
			if (this.getModel("OTPContextModel")) {

				//bind dialog to OTP context model root
				this.getView().bindElement({
					model: "OTPContextModel",
					path: "/"
				});

			}

			//initialize UI control attributes
			this.initOTPDialogUIControlAttributes();

			//get resource bundle
			this.oResourceBundle = this.getResourceBundle();

			//initiate interaction with message manager	
			this.oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.oMessageManager.registerMessageProcessor(this.oMessageProcessor);

			//keep track of this controller on component to invoke initialization
			this.getOwnerComponent().oOTPController = this;

		},

		//initialize OTP dialog UI control attributes
		initOTPDialogUIControlAttributes: function() {

			//reset all input on OTP form
			this.resetFormInput(this.getView().byId("formOTPDialog"));

			//by default enable all input and action controls on the OTP form
			this.setFormInputControlsEnabled([this.getView().byId("formOTPDialog")], true);
			this.setFormActionControlsEnabled([this.getView().byId("formOTPDialog")], true);

			//initialize OTP dialog UI control attributes
			this.getModel("AppViewModel").setProperty("/isSendOTPVisible", true);
			this.getModel("AppViewModel").setProperty("/isMoCInputEnabled", true);
			this.getModel("AppViewModel").setProperty("/isInputOTPVisible", false);
			this.getModel("AppViewModel").setProperty("/isReSendOTPVisible", false);
			this.getModel("AppViewModel").setProperty("/isOTPVerifyButtonEnabled", false);

			//ensure view is not busy
			this.setViewBusy(false);

		},

		//request to send OTP
		onPressSendOTP: function() {

			//local data declaration
			var sOTPPurpose;
			var sSelectedMoCID;
			var sSelectedMoCValue;
			var sSelectedMoCValueText;
			var aMessageVariables = [];
			var iRemainingOTPValidityInSeconds;

			//clear interval where applicable
			if (this.oOTPValidityTimer) {

				//terminate timer event
				clearInterval(this.oOTPValidityTimer);

				//initialize UI display of OTP validity in seconds
				this.getModel("OTPContextModel").setProperty("/remainingOTPValidity", null);

			}

			//set OTP input visible
			this.getModel("AppViewModel").setProperty("/isInputOTPVisible", true);

			//set send OTP button invisible
			this.getModel("AppViewModel").setProperty("/isSendOTPVisible", false);

			//set re-send OTP button visible
			this.getModel("AppViewModel").setProperty("/isReSendOTPVisible", true);

			//set means of communication select to disabled
			this.getModel("AppViewModel").setProperty("/isMoCInputEnabled", false);

			//get selected means of communication and OTP purpose
			sOTPPurpose = this.getModel("OTPContextModel").getProperty("/OTPPurpose");
			sSelectedMoCID = this.getModel("OTPContextModel").getProperty("/SelectedMoCID");

			//get attribute value for selected means of communication
			var aMeansOfCommunication = this.getModel("OTPContextModel").getProperty("/MeansOfCommunication");
			aMeansOfCommunication.forEach(function(oMeansOfCommunication) {

				//where selected means of communication matches 
				if (oMeansOfCommunication.MoCID === sSelectedMoCID) {

					//adopt means of communication value
					sSelectedMoCValue = oMeansOfCommunication.MoCValue;

					//adopt textual description of selected means of communication
					sSelectedMoCValueText = oMeansOfCommunication.MoCValueText;

					//format as mobile phone number where applicable
					if (oMeansOfCommunication.MoCID === "0") {

						//replace (0) where specified
						sSelectedMoCValue = sSelectedMoCValue.replace(/\(0\)/, "");

						//remove formatting characters
						sSelectedMoCValue = sSelectedMoCValue.replace(/-/, "");
						sSelectedMoCValue = sSelectedMoCValue.replace(/\(/, "");
						sSelectedMoCValue = sSelectedMoCValue.replace(/\)/, "");

						//replace '+' as prefix to country code
						sSelectedMoCValue = sSelectedMoCValue.replace(/\+/, "00");

					}

				}

			});

			//set view to busy
			this.setViewBusy(true);

			//determine an OTP request ID
			var sOTPRequestID = this.getUUID();

			//keep track of this request ID in the OTP context
			this.getModel("OTPContextModel").setProperty("/OTPRequestID", sOTPRequestID);

			//request OTP to be sent
			this.getModel("OneTimePinModel").callFunction("/sendOTP", {

				//url parameters
				urlParameters: {
					"OTPRequestID": sOTPRequestID,
					"OTPPurpose": sOTPPurpose,
					"MoCID": sSelectedMoCID,
					"MoCValue": sSelectedMoCValue
				},

				//success handler: received One Time Pin
				success: function(oData, oResponse) {

					//set OTP input placeholder and invoke count down
					if (oData.results && oData.results.length > 0) {}

					//set OTP validity period
					iRemainingOTPValidityInSeconds = 60;

					//set OTP input placeholder to indicate remaining validity time
					this.oOTPValidityTimer = setInterval(function() {

						//build string of remaining OTP validity
						var sRemainingOTPValidity = "Enter in the next " + iRemainingOTPValidityInSeconds + " seconds...";

						//get access to OTP input control
						var oOTPInput = this.getView().byId("inputOTP");

						//where no OTP value has been entered as yet
						if (!oOTPInput.getValue()) {

							//set remaining OTP validity in seconds as OTP input placeholder where applicable
							this.getModel("OTPContextModel").setProperty("/remainingOTPValidity", sRemainingOTPValidity);

						}

						//end of OTP validity reached
						if (iRemainingOTPValidityInSeconds <= 0) {

							//clear interval
							clearInterval(this.oOTPValidityTimer);

							//initialize OTP dialog
							this.initOTPDialogUIControlAttributes();

							//send message to advise that OTP has expired
							this.sendStripMessage(this.getResourceBundle().getText("messageOTPExpiredDoTryAgain"), "Warning", this.getMessageStrip());

						}

						//count down remaining OTP validity in seconds
						iRemainingOTPValidityInSeconds = iRemainingOTPValidityInSeconds - 1;

					}.bind(this), 1000);

					//set view to no longer busy
					this.setViewBusy(false);

					//set array of message variables
					aMessageVariables.push(sSelectedMoCValueText);

					//send message using requested message strip
					this.sendStripMessage(this.getResourceBundle().getText("messageOTPSentSuccessfully", aMessageVariables), "Success", this.getMessageStrip());

				}.bind(this),

				//error handler callback function
				error: function(oError) {

					//render error in OData response 
					this.renderODataErrorResponseToMessageStrip(oError, this.getMessageStrip());

					//set view to no longer busy
					this.setViewBusy(false);

				}.bind(this)

			});

		},

		//request to resend OTP
		onPressReSendOTP: function() {

			//set OTP input visible
			this.getModel("AppViewModel").setProperty("/isInputOTPVisible", false);

			//set send OTP button invisible
			this.getModel("AppViewModel").setProperty("/isSendOTPVisible", true);

			//set re-send OTP button visible
			this.getModel("AppViewModel").setProperty("/isReSendOTPVisible", false);

			//set means of communication select to enabled
			this.getModel("AppViewModel").setProperty("/isMoCInputEnabled", true);

			//set OTP confirm button to disabled
			this.getModel("AppViewModel").setProperty("/isOTPVerifyButtonEnabled", false);

			//initialize input fields
			this.resetFormInput(this.getView().byId("formOTPDialog"));

			//set dialog message strip to invisible for next attempt
			this.getMessageStrip().setVisible(false);

		},

		//on OTP input livechange
		onOneTimePinInputChange: function(oEvent) {

			//get value in OTP input field
			var iOTPValue = oEvent.getSource().getValue();

			//set confirm button to enabled where applicable
			if (/^\d{6}$/.test(iOTPValue)) {
				this.getModel("AppViewModel").setProperty("/isOTPVerifyButtonEnabled", true);
			}

			//set confirm button to disabled where applicable
			else {
				this.getModel("AppViewModel").setProperty("/isOTPVerifyButtonEnabled", false);
			}

		},

		//confirm OTP interaction
		onPressOneTimePinVerifyButton: function() {

			//message handling: invalid form input where applicable
			if (this.hasMissingInput([this.getView().byId("formOTPDialog")]).length > 0) {

				//message handling: incomplete form input detected
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
					sap.ui.core.MessageType.Error, this.getMessageStrip());

				//no further processing at this point
				return;

			}

			//get OTP context
			var oOTPContext = this.getModel("OTPContextModel").getData();

			//set view to busy
			this.setViewBusy(true);

			//validate OTP entered against OTP
			this.getModel("OneTimePinModel").callFunction("/validateOTP", {

				//url parameters
				urlParameters: {
					"OTPRequestID": oOTPContext.OTPRequestID,
					"OTPValue": oOTPContext.OTPValue
				},

				//success handler: validation result received
				success: function(oData, oResponse) {

					//OTP sent is not valid
					if (oData.validateOTP.returnCode !== "0") {

						//message handling: incorrect OTP entered	
						this.sendStripMessage(this.getResourceBundle().getText("messageInvalidOTPEntered"),
							sap.ui.core.MessageType.Error, this.getMessageStrip());

						//ensure view is not busy
						this.setViewBusy(false);

						//no further processing at this point
						return;

					}
					
					//clear OTP timer interval where applicable
					if (this.oOTPValidityTimer) {

						//terminate timer event
						clearInterval(this.oOTPValidityTimer);

						//initialize UI display of OTP validity in seconds
						this.getModel("OTPContextModel").setProperty("/remainingOTPValidity", null);

					}

					//message handling: OTP validated successfully
					this.sendStripMessage(this.getResourceBundle().getText("messageOTPValidatedSuccessfully"),
						"Success", this.getMessageStrip());

					//disable all input and action controls on the OTP form
					this.setFormInputControlsEnabled([this.getView().byId("formOTPDialog")], false);
					this.setFormActionControlsEnabled([this.getView().byId("formOTPDialog")], false);

					//disable verify button on view
					this.getModel("AppViewModel").setProperty("/isOTPVerifyButtonEnabled", false);

					//set view to busy
					this.setViewBusy(false);

					//fire OneTimePinValidated event
					this.getOwnerComponent().fireOneTimePinValidated();

				}.bind(this),

				//error handler callback function
				error: function(oError) {

					//render error in OData response 
					this.renderODataErrorResponseToMessageStrip(oError, this.getMessageStrip());

					//set view to no longer busy
					this.setViewBusy(false);

				}.bind(this)

			});

		},

		//get message strip control
		getMessageStrip: function() {

			//get local message strip
			var oMessageStrip = this.getView().byId("msOneTimePinDialogMessageStrip");

			//get outer message strip
			var oOuterMessageStrip = this.getOwnerComponent().oOuterMessageStrip;

			//outer message strip takes precedence
			if (oOuterMessageStrip) {
				oMessageStrip = oOuterMessageStrip;
			}

			//return message strip
			return oMessageStrip;

		},

		/**
		 * Send message using message strip
		 * @private
		 */
		sendStripMessage: function(sText, sType, oMessageStrip) {

			//message handling: send message
			oMessageStrip.setText(sText);
			oMessageStrip.setType(sType);
			oMessageStrip.setVisible(true);

		}

	});
});