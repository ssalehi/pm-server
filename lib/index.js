/**
 * Created by Eabasir on 01/30/2018.
 */
const Agent = require('./agent.model');
const Customer = require('./customer.model');
const Person = require('./person.model');
const Collection = require('./collection.model');
const Campaign = require('./campaign.model');
const Upload = require('./upload.model');
const Search = require('./search.model');
const Product = require('./product.model');
const ProductType = require('./product_type.model');
const Color = require('./color.model');
const Brand = require('./brand.model');
const Warehouse = require('./warehouse.model');
const Offline = require('./offline.model');
const Page = require('./page.model');
const dbHelpers = require('./db-helpers');
const helpers = require('./helpers');
const errors = require('./errors.list');
const Order = require('./order.model');
const Dictionary = require('./dictionary.model');
const SoldOut = require('./sold_out.model');
const DSS = require('./dss.model');
const TicketAction = require('./ticket_action.model');
const Ticket = require('./ticket.model');
const Tag = require('./tag.model');
const LoyaltyGroup = require('./loyalty_group.model');
const Delivery = require('./delivery.model');
const DeliveryDurationInfo = require('./delivery_duration_info.model');

module.exports = {
  Agent,
  Customer,
  Product,
  ProductType,
  Color,
  Brand,
  Warehouse,
  Page,
  Collection,
  Campaign,
  Person,
  Order,
  dbHelpers,
  helpers,
  Search,
  Upload,
  errors,
  Dictionary,
  Offline,
  SoldOut,
  Ticket,
  TicketAction,
  DSS,
  Tag,
  LoyaltyGroup,
  Delivery,
  DeliveryDurationInfo
};
