sap.ui.define([
	"pnp/onetimepin/controller/Base.controller",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("pnp.onetimepin.controller.Page", {

		//on initialization
		onInit: function() {

			//instantiate view model
			this.oViewModel = new JSONModel({});

			//set view model to view
			this.setModel(this.oViewModel, "AppViewModel");
			
			//set view model to core
			sap.ui.getCore().setModel(this.oViewModel, "AppViewModel");

			//initialize UI control attributes
			this.initOTPDialogUIControlAttributes();

			//attach to display event for navigation without hash change 
			this.getRouter().getTarget("Page").attachDisplay(this.onDisplay, this);

			//get resource bundle
			this.oResourceBundle = this.getResourceBundle();

			//initiate interaction with message manager	
			this.oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.oMessageManager.registerMessageProcessor(this.oMessageProcessor);

		},

		//initialize OTP dialog UI control attributes
		initOTPDialogUIControlAttributes: function() {

			//initialize OTP dialog UI control attributes
			this.getModel("AppViewModel").setProperty("/isSendOTPVisible", true);
			this.getModel("AppViewModel").setProperty("/isMoCInputEnabled", true);
			this.getModel("AppViewModel").setProperty("/isInputOTPVisible", false);
			this.getModel("AppViewModel").setProperty("/isReSendOTPVisible", false);
			this.getModel("AppViewModel").setProperty("/isOTPConfirmButtonEnabled", false);

		},

		//display of One Time Pin view
		onDisplay: function() {

			//initialize UI control attributes
			this.initOTPDialogUIControlAttributes();

			//instantiate new OTP context
			var oOTPContext = {
				"OTPPurpose": this.getOwnerComponent().sOTPPurpose
			};
			
			//set means of communication where available
			if (this.getOwnerComponent().aMeansOfCommunication) {
				
				//adopt means of communication set on the component
				oOTPContext.MeansOfCommunication = this.getOwnerComponent().aMeansOfCommunication;
				
				//default first available means of communication where applicable
				if (Array.isArray(oOTPContext.MeansOfCommunication) && oOTPContext.MeansOfCommunication.length > 0) {
					oOTPContext.SelectedMoCID = oOTPContext.MeansOfCommunication[0].MoCID;
				}
				
			}

			//make available new OTP context for binding
			this.getModel("AppViewModel").setProperty("/OTPContext", oOTPContext);

			//bind dialog to view model instance 
			this.getView().bindElement({
				model: "AppViewModel",
				path: "/OTPContext"
			});

			//initialize input fields
			this.resetFormInput(this.getView().byId("formOTPDialog"));

		},

		//request to send OTP
		onPressSendOTP: function() {

			//local data declaration
			var sOTPPurpose;
			var sSelectedMoCID;
			var sSelectedMoCValue;
			var aMessageVariables = [];
			var iRemainingOTPValidityInSeconds;

			//clear interval where applicable
			if (this.oOTPValidityTimer) {

				//terminate timer event
				clearInterval(this.oOTPValidityTimer);

				//initialize UI display of OTP validity in seconds
				this.getModel("AppViewModel").setProperty("/OTPContext/remainingOTPValidity", null);

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
			sOTPPurpose = this.getModel("AppViewModel").getProperty("/OTPContext/OTPPurpose");
			sSelectedMoCID = this.getModel("AppViewModel").getProperty("/OTPContext/SelectedMoCID");

			//get attribute value for selected means of communication
			var aMeansOfCommunication = this.getModel("AppViewModel").getProperty("/OTPContext/MeansOfCommunication");
			aMeansOfCommunication.forEach(function(oMeansOfCommunication) {

				//where selected means of communication matches 
				if (oMeansOfCommunication.MoCID === sSelectedMoCID) {

					//adopt means of communication value
					sSelectedMoCValue = oMeansOfCommunication.MoCValue;

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
			this.getModel("AppViewModel").setProperty("/isOTPDialogBusy", true);

			//determine an OTP request ID
			var sOTPRequestID = this.getUUID();

			//keep track of this request ID in the OTP context
			this.getModel("AppViewModel").setProperty("/OTPContext/OTPRequestID", sOTPRequestID);

			//request OTP to be sent
			this.getModel("OneTimePinModel").callFunction("/sendOTP", {

				//url parameters
				urlParameters: {
					"OTPRequestID": sOTPRequestID,
					"OTPPurpose": sOTPPurpose,
					"MoCID": sSelectedMoCID,
					"MoCValue": sSelectedMoCValue
				},

				//success handler: received declaration details
				success: function(oData, oResponse) {

					//set OTP input placeholder and invoke count down
					if (oData.results && oData.results.length > 0) {}

					//set OTP validity period
					iRemainingOTPValidityInSeconds = 60;

					//set OTP input placeholder to indicate remaining validity time
					this.oOTPValidityTimer = setInterval(function() {

						//build string of remaining OTP validity
						var sRemainingOTPValidity = "Enter in the next " + iRemainingOTPValidityInSeconds + " seconds...";

						//set remaining OTP validity in seconds as OTP input placeholder
						this.getModel("AppViewModel").setProperty("/OTPContext/remainingOTPValidity", sRemainingOTPValidity);

						//end of OTP validity reached
						if (iRemainingOTPValidityInSeconds <= 0) {

							//advise user to send another OTP
							this.getModel("AppViewModel").setProperty("/OTPContext/remainingOTPValidity", this.getResourceBundle().getText(
								"messageOTPExpiredDoTryAgain"));

							//hide message strip
							this.getMessageStrip().setVisible(false);

							//clear interval
							clearInterval(this.oOTPValidityTimer);

						}

						//count down remaining OTP validity in seconds
						iRemainingOTPValidityInSeconds = iRemainingOTPValidityInSeconds - 1;

					}.bind(this), 1000);

					//set view to no longer busy
					this.getModel("AppViewModel").setProperty("/isOTPDialogBusy", false);

					//set array of message variables
					aMessageVariables.push(sSelectedMoCValue);

					//send message using requested message strip
					this.sendStripMessage(this.getResourceBundle().getText("messageOTPSentSuccessfully", aMessageVariables), "Success", this.getMessageStrip());

				}.bind(this),

				//error handler callback function
				error: function(oError) {

					//render error in OData response 
					this.renderODataErrorResponseToMessageStrip(oError, this.getMessageStrip());

					//set view to no longer busy
					this.getModel("AppViewModel").setProperty("/isOTPDialogBusy", false);

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

			//initialize input fields
			this.resetFormInput(this.getView().byId("formOTPDialog"));

			//set dialog message strip to invisible for next attempt
			this.getMessageStrip().setVisible(false);

		},

		//on OTP input livechange
		onOneTimePinInputChange: function(oEvent) {

			//get value in OTP input field
			var oOTPValue = oEvent.getSource().getValue();

			//set confirm button to enabled where applicable
			if (/^\d{6}$/.test(oOTPValue)) {
				this.getModel("AppViewModel").setProperty("/isOTPConfirmButtonEnabled", true);
			}

			//set confirm button to disabled where applicable
			else {
				this.getModel("AppViewModel").setProperty("/isOTPConfirmButtonEnabled", false);
			}

		},

		//confirm OTP interactin
		onPressOneTimePinConfirmButton: function() {

			//message handling: invalid form input where applicable
			if (this.hasMissingInput([this.getView().byId("formOTPDialog")]).length > 0) {

				//message handling: incomplete form input detected
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
					sap.ui.core.MessageType.Error, this.getMessageStrip());

				//no further processing at this point
				return;

			}

			//get OTP context
			var oOTPContext = this.getModel("AppViewModel").getProperty("/OTPContext");

			//validate OTP entered against OTP
			this.getModel("OneTimePinModel").callFunction("/validateOTP", {

				//url parameters
				urlParameters: {
					"OTPRequestID": oOTPContext.OTPRequestID,
					"OTPValue": oOTPContext.OTPValue
				},

				//success handler: validation result received
				success: function(oData, oResponse) {

					//set OTP input placeholder and invoke count down
					if (oData.validateOTP.returnCode !== "0") {

						//message handling: incorrect OTP entered	
						this.sendStripMessage(this.getResourceBundle().getText("messageInvalidOTPEntered"),
							sap.ui.core.MessageType.Error, this.getMessageStrip());

						//no further processing at this point
						return;

					}

					//message handling: OTP validated successfully
					this.sendStripMessage(this.getResourceBundle().getText("messageOTPValidatedSuccessfully"),
						"Success", this.getMessageStrip());

					//fire OneTimePinValidated event
					this.getOwnerComponent().fireOneTimePinValidated();

				}.bind(this),

				//error handler callback function
				error: function(oError) {

					//render error in OData response 
					this.renderODataErrorResponseToMessageStrip(oError, this.getMessageStrip());

					//set view to no longer busy
					this.getModel("AppViewModel").setProperty("/isOTPDialogBusy", false);

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