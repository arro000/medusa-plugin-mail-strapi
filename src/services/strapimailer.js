import { NotificationService } from "medusa-interfaces";

import Email from "email-templates";

class NodemailerService extends NotificationService {
  static identifier = "strapimailer";

  constructor(
    { orderService, cartService, inviteService, swapService },
    config
  ) {
    super();
    this.config = {
      strapiApiKey: "",
      strapiUri: "",
      fromEmail: "noreply@medusajs.com",
      defaultBcc: "",
      defaultCc: "",
      replyTo: "",
      emailTemplatePath: "data/emailTemplates",
      templateMap: {
        "order.placed": "orderplaced",
      },
      ...config,
    };
    this.orderService = orderService;
    this.cartService = cartService;
    this.inviteService = inviteService;
    this.swapService = swapService;
  }

  async sendMail({ from, to, text, html, cc, bcc, replyTo, subject }) {
    const body = {
      from,
      to,
      text,
      html,
      cc,
      bcc,
      replyTo,
      subject,
    };
    if (!body.bcc && this.config.defaultBcc !== "") {
      body.bcc = this.config.defaultBcc;
    }
    if (!body.cc && this.config.defaultCc !== "") {
      body.cc = this.config.defaultCc;
    }
    if (!body.replyTo && this.config.replyTo !== "") {
      body.replyTo = this.config.replyTo;
    }
    return new Promise((resolve, reject) => {
      fetch(this.config.strapiUri + "/api/email", {
        method: "post",
        headers: {
          Authorization: "bearer " + this.config.strapiApiKey,
          "Content-type": "application/json",
        },
        body: JSON.stringify(body),
      })
        .then(async (response) => {
          resolve(response.status);
          //fs.unlinkSync(file.path);
        })
        .catch((err) => {
          reject(err);
          //fs.unlinkSync(file.path);
        });
    });
  }

  async getMailBody(email, templateName, emailData) {
    let renderedHtml = "";
    if (emailData) {
      renderedHtml = await email.render(templateName, {
        data: emailData.data,
        env: process.env,
      });
    } else {
      renderedHtml = await email.render(templateName, {
        data: {},
        env: process.env,
      });
    }
    return renderedHtml;
  }
  async getMailSubject(email, templateName, emailData) {
    templateName = templateName + "/subject";
    let renderedHtml = "";
    if (emailData) {
      renderedHtml = await email.render(templateName, {
        data: emailData.data,
        env: process.env,
      });
    } else {
      renderedHtml = await email.render(templateName, {
        data: {},
        env: process.env,
      });
    }
    return renderedHtml;
  }

  async sendNotification(eventName, eventData, attachmentGenerator) {
    let templateName = this.getTemplateNameForEvent(eventName);
    if (templateName) {
      const email = new Email({
        message: {
          from: this.config.fromEmail,
        },
        views: {
          root: this.config.emailTemplatePath,
        },
        send: true,
      });
      let emailData = await this.retrieveData(eventName, eventData);
      let renderedHtml = await this.getMailBody(email, templateName, emailData);
      let renderedSubject = await this.getMailSubject(
        email,
        templateName,
        emailData
      );

      const status = await this.sendMail({
        from: this.config.fromEmail,
        to: emailData.to,

        html: renderedHtml,

        subject: renderedSubject,
      });

      return {
        to: emailData.to,
        status,
        data: emailData.data,
      };
    }
    return {
      status: "noDataFound",
    };
  }

  async resendNotification(notification, config, attachmentGenerator) {
    //get template
    let templateName = this.getTemplateNameForEvent(notification.event_name);
    if (templateName) {
      const email = new Email({
        message: {
          from: this.config.fromEmail,
        },
        views: {
          root: this.config.emailTemplatePath,
        },
        send: true,
      });
      //get data
      let emailData = await this.retrieveData(
        notification.event_name,
        notification.data
      );
      let renderedHtml = await this.getMailBody(email, templateName, emailData);
      let renderedSubject = await this.getMailSubject(
        email,
        templateName,
        emailData
      );

      const status = await this.sendMail({
        from: this.config.fromEmail,
        to: notification.to,

        html: renderedHtml,

        subject: renderedSubject,
      });

      return {
        to: notification.to,
        status,
        data: notification.data,
      };
    } else {
      return {
        to: notification.to,
        status: "noTemplateFound",
        data: notification.data,
      };
    }
  }

  async retrieveData(eventName, eventData) {
    let sendData;
    let registeredEvent = this.config.templateMap[eventName];
    let eventType = eventName.split(".")[0];
    if (!registeredEvent) {
      return false;
    } else {
      switch (eventType) {
        case "order":
          sendData = await this.orderService.retrieve(eventData.id, {
            select: ["shipping_total", "tax_total", "subtotal", "total"],
            relations: [
              "customer",
              "billing_address",
              "shipping_address",
              "discounts",
              "discounts.rule",
              //"discounts.rule.valid_for",
              "shipping_methods",
              "shipping_methods.shipping_option",
              "payments",
              "fulfillments",
              "fulfillments.tracking_links",
              "returns",
              "gift_cards",
              "gift_card_transactions",
              "items",
            ],
          });
          break;
        case "invite":
          sendData = await this.inviteService.list(
            {
              id: eventData.id,
            },
            {}
          );
          return {
            to: sendData[0].user_email,
            data: sendData[0],
          };
        case "swap":
          sendData = await this.swapService.retrieve(eventData.id, {
            relations: [
              "additional_items",
              "return_order",
              "return_order.items",
              "return_order.items.item",
              "return_order.shipping_method",
              "return_order.shipping_method.shipping_option",
            ],
          });
          break;
        case "user":
          console.log(
            "INFO: user-related event notifications are currently not supported."
          );
          // TODO: fetch user data
          break;
        case "customer":
          console.log(
            "INFO: customer related event notifications are currently not supported."
          );
          // TODO: fetch customer data
          break;
      }
      return {
        to: sendData.email,
        data: sendData,
      };
    }
  }

  getTemplateNameForEvent(eventName) {
    let templateNameForEvent = this.config.templateMap[eventName];
    if (templateNameForEvent) {
      return templateNameForEvent;
    } else {
      return false;
    }
  }
}

export default NodemailerService;
