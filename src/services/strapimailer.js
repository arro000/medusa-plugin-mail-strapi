import { NotificationService } from "medusa-interfaces";

import Email from "email-templates";

class NodemailerService extends NotificationService {
  static identifier = "strapimailer";

  constructor(
    { orderService, cartService, inviteService, swapService },
    config
  ) {
    super();
    console.log("mailer");
    this.config = {
      strapiApiKey: "",
      strapiUri: "",
      fromEmail: "noreply@medusajs.com",
      transport: {
        sendmail: true,
        path: "/usr/sbin/sendmail",
        newline: "unix",
      },
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
  async sendNotification(eventName, eventData, attachmentGenerator) {
    let emailData = await this.retrieveData(eventName, eventData);
    if (emailData) {
      let templateName = this.getTemplateNameForEvent(eventName);
      const email = new Email({
        message: {
          from: this.config.fromEmail,
        },
        views: {
          root: this.config.emailTemplatePath,
        },
        send: true,
      });
      let renderedHtml = await email.render(templateName, {
        data: emailData.data,
        env: process.env,
      });
      const status = await this.sendMail({
        from: this.config.fromEmail,
        to: emailData.to,

        html: renderedHtml,

        subject: "test",
      });
      // }) await email
      //   .send({
      //     template: templateName,
      //     message: {
      //       to: emailData.to,
      //     },
      //     locals: {
      //       data: emailData.data,
      //       env: process.env,
      //     },
      //   })
      //   .then(() => "sent")
      //   .catch((err) => {
      //     throw err;
      //   });
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
      let renderedHtml = await email.render(templateName, {
        data: emailData.data,
        env: process.env,
      });
      const status = await this.sendMail({
        from: this.config.fromEmail,
        to: notification.to,

        html: renderedHtml,

        subject: "test",
      });
      // const status = await email
      //   .send({
      //     template: templateName,
      //     message: {
      //       to: notification.to,
      //     },
      //     locals: {
      //       data: notification.data,
      //       env: process.env,
      //     },
      //   })
      //   .then(() => "sent")
      //   .catch(() => "failed");
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
