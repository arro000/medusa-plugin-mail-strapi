# Medusa-plugin-mail-strapi

A notification service based on strapi mail api

## Details

It uses the email-templates npm package and pug for rendering html emails. Documentation for this can be found here: [https://github.com/forwardemail/email-templates](https://github.com/forwardemail/email-templates)

The folder structure for the template is

```
emailTemplatePath/  
│
└─── templateMap.value/
    │   index.pug    # html body for the mail
    │   subject.pug  # the string subject of mail

```

You need a Strapi instance as CMS  

## Available options (default configuration)

```js
{
     // The baseurl for your strapi server
      strapiUri: STRAPI_URI,
      fromEmail: "no-reply@strapi.io",

      // an api key from strapi where the email send permission is enabled
      strapiApiKey: STRAPI_API_KEY,

      // this is the path where your email templates are stored
      emailTemplatePath: "data/emailTemplates",
      // this maps the folder/template name to a medusajs event to use the right template
      // only the events that are registered here are subscribed to
      templateMap: {
        // "eventname": "templatename",
        "order.placed": "orderplaced",
        "invite.created": "invitemember",
      },


      //optionals 
      replyTo:""
      defaultBcc:"",
      defaultCc:"",
}
```
