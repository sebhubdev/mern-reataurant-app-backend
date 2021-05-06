import mongodb from "mongodb";
const ObjectId=mongodb.ObjectID

let restaurants;

export default class RestaurantsDAO
{
    static async injectDB(conn){
        /*Esto es para conectar con la base de datos*/
        if(restaurants)
        {
            return
        }
        try 
        {
            restaurants= await conn.db(process.env.RESTREVIEW_NS).collection('restaurants');
        }
        catch(err)
        {
            console.error(err);
        }
    }

    static async getRestaurants(
    {
        filters=null,
        page=0,
        restaurantsPerPage=10,
    }={})
    {
        let query
        if(filters)
        {
            if("name" in filters)
            {
                query={$text:{$search:filters['name']}}
            }
            else if("cuisine" in filters)
            {
                query={"cuisine":{$eq:filters['cuisine']}}
            }
            else if("zipcode" in filters)
            {
                query={"address.zipcode":{$eq:filters['zipcode']}}
            }
        }

        let cursor
        try
        {
            cursor=await restaurants.find(query)
        } 
        catch (err)
        {
            console.error(err);
            return {restaurantsList:[],totalNumRestaurants:0}
        }

        const displayCursor=cursor.limit(restaurantsPerPage).skip(restaurantsPerPage*page)

        try
        {
            const restaurantsList = await displayCursor.toArray();
            const totalNumRestaurants=await restaurants.countDocuments(query)
            return {restaurantsList,totalNumRestaurants}
        }
        catch (err)
        {
            console.error(err);
            return {restaurantsList:[],totalNumRestaurants:0}
        }
    }

    static async getRestaurantById(id)
    {
        try 
        {
            const pipeline=
            [
                {
                    $match:
                    {
                        _id:new ObjectId(id)
                    }
                },
                {
                    $lookup:
                    {
                        from:"reviews",
                        let:
                        {
                            id:"$_id"
                        },
                        pipeline:
                        [
                            {
                                $match:
                                {
                                    $expr:
                                    {
                                        $eq:["$restaurant_id","$$id"]
                                    }
                                }
                            },
                            {
                                $sort:
                                {
                                    date:-1
                                }
                            }
                        ],
                        as:"reviews"
                    }
                },
                {
                    $addFields:
                    {
                        reviews:"$reviews"
                    }
                }
            ]
            return await restaurants.aggregate(pipeline).next();
        }
        catch(err)
        {
            return err
        }
    }

    static async getCuisines()
    {
        let cuisines=[];
        try
        {
            // distinct es para que los resultados no se repitan
            cuisines=await restaurants.distinct("cuisine")
            return cuisines;
        }
        catch(err)
        {
            return err;
        }
    }


}