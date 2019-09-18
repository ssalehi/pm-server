const models = require('./mongo/models.mongo');
const mongoose = require('mongoose');
const env = require('./env');
const moment = require('moment');
const orderModel = require('./lib/order.model')




const loadpug = async (order_id) => {
    try {
        const orderdata = await models()['Order'].findOne({
            _id: mongoose.Types.ObjectId(order_id),
        });


        const customerdata = await models()['Customer'].findOne({
            _id: mongoose.Types.ObjectId(orderdata.customer_id)
        });

        const mobile_no = customerdata.mobile_no;
        const email_add = customerdata.username;
        let time = moment().format("YYYY/MM/DD HH:mm:ss").toString();

        let dataArr = ["",
            env.merchant_code,
            env.terminal_code,
            orderdata.IPG_data.invoice_number,
            orderdata.IPG_data.invoice_date,
            orderdata.IPG_data.amount,
            env.app_redirect_address,
            orderdata.IPG_data.action,
            time,
            ""
        ];

        let signedString = await new orderModel().generateDigitalSignature(dataArr);
      


        const IdArray = [
            'invoiceNumber',
            'invoiceDate',
            'amount',
            'terminalCode',
            'merchantCode',
            'redirectAddress',
            'timeStamp',
            'action',
            'mobile',
            'email',
            'sign'
        ];

        IdArray.invoiceNumber = orderdata.IPG_data.invoice_number;
        IdArray.invoiceDate = orderdata.IPG_data.invoice_date;
        IdArray.amount = orderdata.IPG_data.amount;
        IdArray.terminalCode = orderdata.IPG_data.terminal_code;
        IdArray.merchantCode = orderdata.IPG_data.merchant_code;
        IdArray.redirectAddress = env.app_redirect_address;
        IdArray.timeStamp = time;
        IdArray.action = orderdata.IPG_data.action;
        IdArray.mobile = mobile_no
        IdArray.email = email_add
        IdArray.sign = signedString
   
        

        return (IdArray)



    } catch (err) {
        console.log('preparing data to send to bank failed');
    }
}




module.exports = {
    loadpug
};