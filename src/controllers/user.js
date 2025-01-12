import User from '../models/user.js'
import Group from '../models/group.js'
import Streaming from '../models/streaming.js'
import GroupControllers from './group.js'
import StreamingControllers from './streaming.js'
import jwt from "jsonwebtoken"

class UserControllers {
    static async createUser(req, res) {
        try {
            const { name, email, cpf, phone, password, gender } = req.body

            const avatar_url = gender === "m" ? process.env.MALE : gender === "f" ? process.env.FEMALE : process.env.OTHER

            const user = await User.create({
                name,
                email,
                password,
                cpf,
                phone,
                gender,
                avatar_url
            })

            delete user.password

            const token = jwt.sign({
                id: user.id
            }, process.env.SECRET, { expiresIn: "8d" })

            res.status(201).json({ token, id: user.id })
        }
        catch (error) {
            res.status(500).json(error)
        }
    }

    static async getAllUsers(req, res) {
        try {
            const users = await User.find()

            
            await Promise.all(users.map(async user => {

                user = await StreamingControllers.getUserStreaming(user)

            }))     

            res.json(users)
        } catch (error) {
            res.status(500).json(error)
        }
    }

    static async getUserById(req, res) {
        try {
            const { id } = req.params
            const user = await User.findById(id)

            let filteredUser = await StreamingControllers.getUserStreaming(user)

            

            filteredUser.already_member = await UserControllers.getUserGroups(id)

            res.json(filteredUser)
        } catch (error) {
            res.status(500).json(error)
        }
    }

    static async getUserGroups(id) {
        const groups = await Group.find({
            members: {
                $elemMatch: {
                    userId: id
                }
            }
        })

        const filteredGroupData = await Promise.all(groups.map(async group => {

            return await GroupControllers.filterGroupsData(group)

        }))

        return filteredGroupData
    }

    static async recoveryPassword(req, res) {
        const { email, phone, cpf, newPassword } = req.body

        try {
            const user = await User.findOne({ email, phone, cpf })

            if (user) {
                await User.findByIdAndUpdate(user.id, {
                    password: newPassword, updated_at: new Date(), new: true
                })
                res.json({})
            }
            else {
                throw "Usuário não encontrado"
            }
        } catch (error) {
            res.status(404).json({ error })
        }


    }

    static async updateUser(req, res) {
        try {
            const { id } = req.params
            const { name, bio, contacts, searching_for, notification } = req.body

            const userUpdated = await User.findByIdAndUpdate(id, {
                name, bio, contacts, searching_for, notification, updated_at: new Date(), new: true
            }, {
                returnDocument: "after"
            })

            res.json({})
        }
        catch (error) {
            res.status(500).json(error)
        }
    }

    static async deleteUser(req, res) {
        try {
            const { id } = req.params

            await User.findByIdAndRemove(id)

            res.status(204).json({})
        }
        catch (error) {
            res.status(500).json(error)
        }
    }

    static async login(req, res) {
        try {
            const { email, password } = req.body

            const user = await User.findOne({
                email
            }).select("+password")

            if (!user) {
                res.status(404).json({ error: "usuário não encontrado" })
            }

            if (user.password !== password) {
                res.status(409).json({ error: "Senha inválida" })
            }

            const token = jwt.sign({
                id: user.id
            }, process.env.SECRET, { expiresIn: "8d" })

            res.json({ token, id: user.id })
        } catch (error) {

        }
    }
}

export default UserControllers