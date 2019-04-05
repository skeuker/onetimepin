sap.ui.define([
	"pnp/onetimepin/controller/Base.controller",
	"sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("pnp.onetimepin.controller.App", {

		//on initialization
		onInit: function() {

			//set view model to owner component
			this.setModel(new JSONModel({}), "AppViewModel");

			//initialize UI control attributes
			this.initOTPDialogUIControlAttributes();

			//get resource bundle
			this.oResourceBundle = this.getResourceBundle();

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

		//launch OTP dialog
		onPressLaunchOTPDialog: function() {

			//create one time pin dialog
			this.oOneTimePinDialog = sap.ui.xmlfragment("pnp.onetimepin.fragment.OneTimePinDialog", this);

			//add dialog to this view
			this.getView().addDependent(this.oOneTimePinDialog);

			//attach to the dialog's close event
			this.oOneTimePinDialog.attachAfterClose(function() {

				//initialize UI control attributes
				this.initOTPDialogUIControlAttributes();

				//distroy dialog
				this.oOneTimePinDialog.destroy();

			}.bind(this));

			//instantiate new OTP context
			var oOTPContext = {
				"MeansOfCommunication": [{
					"MoCID": "CellPhone",
					"MoCValue": "082-9777444"
				}, {
					"MoCID": "eMail",
					"MoCValue": "stefan.keuker@gmail.com"
				}],
				"SelectedMoCID": "CellPhone"
			};

			//make available new hierarchy item for binding
			this.getModel("AppViewModel").setProperty("/OTPContext", oOTPContext);

			//bind dialog to view model instance 
			this.oOneTimePinDialog.bindElement({
				model: "AppViewModel",
				path: "/OTPContext"
			});

			//initialize input fields
			this.resetFormInput(sap.ui.getCore().byId("formOTPDialog"));

			//delay because addDependent will do a async rerendering 
			this.oOneTimePinDialog.open();

		},

		//request to send OTP
		onPressSendOTP: function() {

			//set OTP input visible
			this.getModel("AppViewModel").setProperty("/isInputOTPVisible", true);

			//set send OTP button invisible
			this.getModel("AppViewModel").setProperty("/isSendOTPVisible", false);

			//set re-send OTP button visible
			this.getModel("AppViewModel").setProperty("/isReSendOTPVisible", true);

			//set means of communication select to disabled
			this.getModel("AppViewModel").setProperty("/isMoCInputEnabled", false);

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
			this.resetFormInput(sap.ui.getCore().byId("formOTPDialog"));

			//set dialog message strip to invisible for next attempt
			sap.ui.getCore().byId("msOneTimePinDialogMessageStrip").setVisible(false);

		},

		//on OTP input livechange
		onOneTimePinInputChange: function(oEvent) {

			//get value in OTP input field
			var oOTPValue = oEvent.getSource().getValue();

			//set confirm button to enabled where applicable
			if (/^\d{4}$/.test(oOTPValue)) {
				this.getModel("AppViewModel").setProperty("/isOTPConfirmButtonEnabled", true);
			}

			//set confirm button to disabled where applicable
			else {
				this.getModel("AppViewModel").setProperty("/isOTPConfirmButtonEnabled", false);
			}

		},

		//cancel OTP interaction
		onPressOneTimePinCancelButton: function() {

			//cancel OTP interaction dialog
			sap.ui.getCore().byId("diaOneTimePin").close();

		},

		//confirm OTP interactin
		onPressOneTimePinConfirmButton: function() {

			//local data declaration
			var bOTPIsValid = false;

			//message handling: invalid form input where applicable
			if (this.hasMissingInput([sap.ui.getCore().byId("formOTPDialog")]).length > 0) {

				//message handling: incomplete form input detected
				this.sendStripMessage(this.getResourceBundle().getText("messageInputCheckedWithErrors"),
					sap.ui.core.MessageType.Error, sap.ui.getCore().byId("msOneTimePinDialogMessageStrip"));

				//no further processing at this point
				return;

			}

			//validate OTP entered against OTP

			//entered OTP is not valid
			if (!bOTPIsValid) {

				//message handling: incorrect OTP entered	
				this.sendStripMessage(this.getResourceBundle().getText("messageInvalidOTPEntered"),
					sap.ui.core.MessageType.Error, sap.ui.getCore().byId("msOneTimePinDialogMessageStrip"));

				//no further processing at this point
				return;

			}

			//close OTP interaction dialog
			sap.ui.getCore().byId("diaOneTimePin").close();

		}

	});
});